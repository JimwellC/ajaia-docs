// End-to-end API tests: real route handlers, real Postgres. Skipped unless TEST_DATABASE_URL is set.
import { beforeEach, describe, expect, it } from "vitest";
import * as documents from "@/app/api/documents/route";
import * as document from "@/app/api/documents/[id]/route";
import * as shares from "@/app/api/documents/[id]/shares/route";
import * as share from "@/app/api/documents/[id]/shares/[userId]/route";
import * as importRoute from "@/app/api/import/route";
import { ALICE, BOB, CAROL, call, resetDb } from "./helpers";

const hasDb = Boolean(process.env.TEST_DATABASE_URL);

async function createDoc(as = ALICE, title = "Plan") {
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

  it("creates, edits and reopens a document with its formatting", async () => {
    const id = await createDoc();
    const html = "<h1>Goals</h1><p><strong>Ship</strong> <u>it</u></p><ul><li><p>one</p></li></ul>";
    const saved = await call(document.PATCH, { method: "PATCH", as: ALICE, params: { id }, json: { content: html, version: 1 } });
    expect(saved.status).toBe(200);
    expect(saved.body.version).toBe(2);

    const reopened = await call(document.GET, { as: ALICE, params: { id } });
    expect(reopened.body).toMatchObject({ title: "Plan", content: html, version: 2, role: "owner" });
  });

  it("rejects a save based on a stale version and returns the latest content", async () => {
    const id = await createDoc();
    await call(shares.POST, { method: "POST", as: ALICE, params: { id }, json: { email: "bob@ajaia.test" } });

    // Alice and Bob both opened version 1. Bob saves first.
    const bob = await call(document.PATCH, { method: "PATCH", as: BOB, params: { id }, json: { content: "<p>Bob</p>", version: 1 } });
    expect(bob.status).toBe(200);

    const alice = await call(document.PATCH, { method: "PATCH", as: ALICE, params: { id }, json: { content: "<p>Alice</p>", version: 1 } });
    expect(alice.status).toBe(409);
    expect(alice.body.error.code).toBe("conflict");
    expect(alice.body.error.latest).toMatchObject({ content: "<p>Bob</p>", version: 2 });

    // Bob's work was not overwritten.
    const current = await call(document.GET, { as: ALICE, params: { id } });
    expect(current.body.content).toBe("<p>Bob</p>");
  });

  it("enforces owner, editor, viewer and no-access permissions", async () => {
    const id = await createDoc();
    await call(shares.POST, { method: "POST", as: ALICE, params: { id }, json: { email: "bob@ajaia.test", role: "viewer" } });

    // Viewer can read but not write, share or delete.
    expect((await call(document.GET, { as: BOB, params: { id } })).body.role).toBe("viewer");
    const write = await call(document.PATCH, { method: "PATCH", as: BOB, params: { id }, json: { content: "x", version: 1 } });
    expect(write.status).toBe(403);
    expect((await call(shares.POST, { method: "POST", as: BOB, params: { id }, json: { email: "carol@ajaia.test" } })).status).toBe(403);
    expect((await call(document.DELETE, { method: "DELETE", as: BOB, params: { id } })).status).toBe(403);

    // Upgrading to editor allows writing.
    expect((await call(share.PATCH, { method: "PATCH", as: ALICE, params: { id, userId: BOB }, json: { role: "editor" } })).status).toBe(200);
    expect((await call(document.PATCH, { method: "PATCH", as: BOB, params: { id }, json: { content: "x", version: 1 } })).status).toBe(200);

    // Carol has no grant: the document looks like it doesn't exist.
    expect((await call(document.GET, { as: CAROL, params: { id } })).status).toBe(404);

    // Removing access takes effect immediately.
    expect((await call(share.DELETE, { method: "DELETE", as: ALICE, params: { id, userId: BOB } })).status).toBe(204);
    expect((await call(document.GET, { as: BOB, params: { id } })).status).toBe(404);
  });

  it("separates owned and shared documents in the list", async () => {
    const id = await createDoc(ALICE, "Shared plan");
    await createDoc(BOB, "Bob's own");
    await call(shares.POST, { method: "POST", as: ALICE, params: { id }, json: { email: "BOB@ajaia.test", role: "viewer" } });

    const list = await call(documents.GET, { as: BOB });
    expect(list.body.owned.map((d: { title: string }) => d.title)).toEqual(["Bob's own"]);
    expect(list.body.shared).toEqual([expect.objectContaining({ title: "Shared plan", ownerName: "Alice Reyes", role: "viewer" })]);
  });

  it("validates sharing requests", async () => {
    const id = await createDoc();
    const send = (json: unknown) => call(shares.POST, { method: "POST", as: ALICE, params: { id }, json });
    expect((await send({ email: "nobody@ajaia.test" })).status).toBe(404);
    expect((await send({ email: "alice@ajaia.test" })).status).toBe(400);
    expect((await send({ email: "bob@ajaia.test" })).status).toBe(201);
    expect((await send({ email: "bob@ajaia.test" })).status).toBe(409);
    expect((await send({ email: "oops" })).status).toBe(400);
  });

  it("imports a markdown file as a new editable document", async () => {
    const form = new FormData();
    form.append("file", new File(["# Notes\n\n- **one**\n- two"], "team notes.md", { type: "text/markdown" }));
    const imported = await call(importRoute.POST, { method: "POST", as: ALICE, body: form });
    expect(imported.status).toBe(201);

    const id = imported.body.id;
    const doc = await call(document.GET, { as: ALICE, params: { id } });
    expect(doc.body.title).toBe("team notes");
    expect(doc.body.content).toContain("<strong>one</strong>");
    expect(doc.body.content).toContain("<h1>Notes</h1>");
  });

  it("rejects unsupported uploads and malformed JSON", async () => {
    const form = new FormData();
    form.append("file", new File(["x"], "photo.png"));
    const upload = await call(importRoute.POST, { method: "POST", as: ALICE, body: form });
    expect(upload.status).toBe(415);

    const req = new Request("http://test.local/api", {
      method: "POST",
      headers: { cookie: `ajaia_uid=${ALICE}`, "content-type": "application/json" },
      body: "{not json",
    });
    const res = await documents.POST(req, { params: Promise.resolve({}) } as never);
    expect(res.status).toBe(400);
  });
});
