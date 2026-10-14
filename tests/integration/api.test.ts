// End-to-end API tests: real route handlers, real Postgres. Skipped unless TEST_DATABASE_URL is set.
import { beforeEach, describe, expect, it } from "vitest";
import * as documents from "@/app/api/documents/route";
import * as document from "@/app/api/documents/[id]/route";
import * as shares from "@/app/api/documents/[id]/shares/route";
import * as share from "@/app/api/documents/[id]/shares/[userId]/route";
import * as importRoute from "@/app/api/import/route";
import * as session from "@/app/api/session/route";
import * as health from "@/app/api/health/route";
import * as exportRoute from "@/app/api/documents/[id]/export/route";
import { getPool } from "@/lib/db";
import { JIMWELL, JIM, JC, call, resetDb, sessionCookie } from "./helpers";

const hasDb = Boolean(process.env.TEST_DATABASE_URL);

async function createDoc(as = JIMWELL, title = "Plan") {
  const res = await call(documents.POST, { method: "POST", as, json: { title } });
  expect(res.status).toBe(201);
  return res.body.id as string;
}

describe.skipIf(!hasDb)("documents API", () => {
  beforeEach(resetDb);

  it("requires sign-in", async () => {
    const res = await call(documents.GET);
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("unauthenticated");
  });

  it("rejects forged and expired session cookies", async () => {
    // A cookie holding a raw user id is not a session.
    expect((await call(documents.GET, { cookie: `ajaia_session=${JIMWELL}` })).status).toBe(401);
    expect((await call(documents.GET, { cookie: `ajaia_uid=${JIMWELL}` })).status).toBe(401);
    expect((await call(documents.GET, { cookie: "ajaia_session=not-a-real-token" })).status).toBe(401);
    expect((await call(documents.GET, { cookie: await sessionCookie(JIMWELL, { expired: true }) })).status).toBe(401);
  });

  it("signs in with a random token and signing out revokes it", async () => {
    const signIn = await call(session.POST, { method: "POST", json: { userId: JIMWELL } });
    expect(signIn.status).toBe(200);
    const setCookie = signIn.headers.get("set-cookie") ?? "";
    expect(setCookie).toMatch(/^ajaia_session=[A-Za-z0-9_-]{43};/);
    expect(setCookie).toMatch(/HttpOnly/i);
    expect(setCookie.toLowerCase()).toContain("samesite=lax");
    expect(setCookie).not.toContain(JIMWELL);
    const cookie = setCookie.split(";")[0];

    expect((await call(documents.GET, { cookie })).status).toBe(200);
    expect((await call(session.DELETE, { method: "DELETE", cookie })).status).toBe(200);
    expect((await call(documents.GET, { cookie })).status).toBe(401);
  });

  it("rejects sign-in as an unknown user", async () => {
    expect((await call(session.POST, { method: "POST", json: { userId: "u_nobody" } })).status).toBe(400);
  });

  it("sanitizes saved and imported HTML", async () => {
    const id = await createDoc();
    const dirty = '<p onclick="x()">Hi</p><script>alert(1)</script><img src=x onerror=y()>';
    const saved = await call(document.PATCH, { method: "PATCH", as: JIMWELL, params: { id }, json: { content: dirty, version: 1 } });
    expect(saved.status).toBe(200);
    expect((await call(document.GET, { as: JIMWELL, params: { id } })).body.content).toBe("<p>Hi</p>");

    const form = new FormData();
    form.append("file", new File(['<script>alert(1)</script>\n\n**bold**'], "x.md", { type: "text/markdown" }));
    const imported = await call(importRoute.POST, { method: "POST", as: JIMWELL, body: form });
    const content = (await call(document.GET, { as: JIMWELL, params: { id: imported.body.id } })).body.content;
    expect(content).toContain("<strong>bold</strong>");
    expect(content).not.toContain("<script");
  });

  it("creates, edits and reopens a document with its formatting", async () => {
    const id = await createDoc();
    const html = "<h1>Goals</h1><p><strong>Ship</strong> <u>it</u></p><ul><li><p>one</p></li></ul>";
    const saved = await call(document.PATCH, { method: "PATCH", as: JIMWELL, params: { id }, json: { content: html, version: 1 } });
    expect(saved.status).toBe(200);
    expect(saved.body.version).toBe(2);

    const reopened = await call(document.GET, { as: JIMWELL, params: { id } });
    expect(reopened.body).toMatchObject({ title: "Plan", content: html, version: 2, role: "owner" });
  });

  it("rejects a save based on a stale version and returns the latest content", async () => {
    const id = await createDoc();
    await call(shares.POST, { method: "POST", as: JIMWELL, params: { id }, json: { email: "jim@ajaia.test" } });

    // Jimwell and Jim both opened version 1. Jim saves first.
    const jim = await call(document.PATCH, { method: "PATCH", as: JIM, params: { id }, json: { content: "<p>Jim</p>", version: 1 } });
    expect(jim.status).toBe(200);

    const jimwell = await call(document.PATCH, { method: "PATCH", as: JIMWELL, params: { id }, json: { content: "<p>Jimwell</p>", version: 1 } });
    expect(jimwell.status).toBe(409);
    expect(jimwell.body.error.code).toBe("conflict");
    expect(jimwell.body.error.latest).toMatchObject({ content: "<p>Jim</p>", version: 2 });

    // Jim's work was not overwritten.
    const current = await call(document.GET, { as: JIMWELL, params: { id } });
    expect(current.body.content).toBe("<p>Jim</p>");
  });

  it("enforces owner, editor, viewer and no-access permissions", async () => {
    const id = await createDoc();
    await call(shares.POST, { method: "POST", as: JIMWELL, params: { id }, json: { email: "jim@ajaia.test", role: "viewer" } });

    // Viewer can read but not write, share or delete.
    expect((await call(document.GET, { as: JIM, params: { id } })).body.role).toBe("viewer");
    const write = await call(document.PATCH, { method: "PATCH", as: JIM, params: { id }, json: { content: "x", version: 1 } });
    expect(write.status).toBe(403);
    expect((await call(shares.POST, { method: "POST", as: JIM, params: { id }, json: { email: "jc@ajaia.test" } })).status).toBe(403);
    expect((await call(document.DELETE, { method: "DELETE", as: JIM, params: { id } })).status).toBe(403);

    // Upgrading to editor allows writing.
    expect((await call(share.PATCH, { method: "PATCH", as: JIMWELL, params: { id, userId: JIM }, json: { role: "editor" } })).status).toBe(200);
    expect((await call(document.PATCH, { method: "PATCH", as: JIM, params: { id }, json: { content: "x", version: 1 } })).status).toBe(200);

    // JC has no grant: the document looks like it doesn't exist.
    expect((await call(document.GET, { as: JC, params: { id } })).status).toBe(404);

    // Removing access takes effect immediately.
    expect((await call(share.DELETE, { method: "DELETE", as: JIMWELL, params: { id, userId: JIM } })).status).toBe(204);
    expect((await call(document.GET, { as: JIM, params: { id } })).status).toBe(404);
  });

  it("separates owned and shared documents in the list", async () => {
    const id = await createDoc(JIMWELL, "Shared plan");
    await createDoc(JIM, "Jim's own");
    await call(shares.POST, { method: "POST", as: JIMWELL, params: { id }, json: { email: "JIM@ajaia.test", role: "viewer" } });

    const list = await call(documents.GET, { as: JIM });
    expect(list.body.owned.map((d: { title: string }) => d.title)).toEqual(["Jim's own"]);
    expect(list.body.shared).toEqual([expect.objectContaining({ title: "Shared plan", ownerName: "Jimwell Calma", role: "viewer" })]);
  });

  it("validates sharing requests", async () => {
    const id = await createDoc();
    const send = (json: unknown) => call(shares.POST, { method: "POST", as: JIMWELL, params: { id }, json });
    expect((await send({ email: "nobody@ajaia.test" })).status).toBe(404);
    expect((await send({ email: "jimwell@ajaia.test" })).status).toBe(400);
    expect((await send({ email: "jim@ajaia.test" })).status).toBe(201);
    expect((await send({ email: "jim@ajaia.test" })).status).toBe(409);
    expect((await send({ email: "oops" })).status).toBe(400);
  });

  it("imports a markdown file as a new editable document", async () => {
    const form = new FormData();
    form.append("file", new File(["# Notes\n\n- **one**\n- two"], "team notes.md", { type: "text/markdown" }));
    const imported = await call(importRoute.POST, { method: "POST", as: JIMWELL, body: form });
    expect(imported.status).toBe(201);

    const id = imported.body.id;
    const doc = await call(document.GET, { as: JIMWELL, params: { id } });
    expect(doc.body.title).toBe("team notes");
    expect(doc.body.content).toContain("<strong>one</strong>");
    expect(doc.body.content).toContain("<h1>Notes</h1>");
  });

  it("downloads a document as Markdown and as plain text", async () => {
    const id = await createDoc(JIMWELL, "Q4 plan");
    const html = "<h1>Goals</h1><p><strong>Ship</strong> it</p><ul><li><p>one</p></li></ul>";
    await call(document.PATCH, { method: "PATCH", as: JIMWELL, params: { id }, json: { content: html, version: 1 } });

    const md = await call(exportRoute.GET, { as: JIMWELL, params: { id }, url: "?format=md" });
    expect(md.status).toBe(200);
    expect(md.headers.get("content-type")).toBe("text/markdown; charset=utf-8");
    expect(md.headers.get("content-disposition")).toBe(`attachment; filename="Q4 plan.md"; filename*=UTF-8''Q4%20plan.md`);
    expect(md.raw).toBe("# Q4 plan\n\n# Goals\n\n**Ship** it\n\n- one\n");

    const txt = await call(exportRoute.GET, { as: JIMWELL, params: { id }, url: "?format=txt" });
    expect(txt.status).toBe(200);
    expect(txt.headers.get("content-type")).toBe("text/plain; charset=utf-8");
    expect(txt.headers.get("content-disposition")).toContain('filename="Q4 plan.txt"');
    expect(txt.raw).toBe("Q4 plan\n\nGoals\n\nShip it\n\n• one\n");

    expect((await call(exportRoute.GET, { as: JIMWELL, params: { id }, url: "?format=pdf" })).status).toBe(400);
  });

  it("lets a viewer download and hides the document from non-members", async () => {
    const id = await createDoc(JIMWELL, "Shared notes");
    await call(shares.POST, { method: "POST", as: JIMWELL, params: { id }, json: { email: "jim@ajaia.test", role: "viewer" } });
    expect((await call(exportRoute.GET, { as: JIM, params: { id }, url: "?format=md" })).status).toBe(200);
    expect((await call(exportRoute.GET, { as: JC, params: { id }, url: "?format=md" })).status).toBe(404);
    expect((await call(exportRoute.GET, { params: { id }, url: "?format=md" })).status).toBe(401);
  });

  it("rejects unsupported uploads and malformed JSON", async () => {
    const form = new FormData();
    form.append("file", new File(["x"], "photo.png"));
    const upload = await call(importRoute.POST, { method: "POST", as: JIMWELL, body: form });
    expect(upload.status).toBe(415);

    const req = new Request("http://test.local/api", {
      method: "POST",
      headers: { cookie: await sessionCookie(JIMWELL), "content-type": "application/json" },
      body: "{not json",
    });
    const res = await documents.POST(req, { params: Promise.resolve({}) } as never);
    expect(res.status).toBe(400);
  });
});

describe.skipIf(!hasDb)("health check", () => {
  const get = async () => {
    const res = await health.GET();
    return { status: res.status, body: await res.json(), cache: res.headers.get("cache-control") };
  };

  it("returns 200 when the database is reachable and every migration is applied", async () => {
    const res = await get();
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true, database: "ok", pendingMigrations: [] });
    expect(res.cache).toBe("no-store");
  });

  it("returns 503 and names the migration when one is pending, without connection details", async () => {
    const name = "003_sessions.sql";
    const { rows } = await getPool().query("DELETE FROM schema_migrations WHERE name = $1 RETURNING applied_at", [name]);
    try {
      const res = await get();
      expect(res.status).toBe(503);
      expect(res.body).toEqual({ ok: false, database: "ok", pendingMigrations: [name] });
      expect(JSON.stringify(res.body)).not.toMatch(/postgres|localhost|password/i);
    } finally {
      await getPool().query("INSERT INTO schema_migrations (name, applied_at) VALUES ($1, $2)", [name, rows[0].applied_at]);
    }
  });
});
