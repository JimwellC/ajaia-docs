import { randomBytes } from "node:crypto";
import { getPool } from "@/lib/db";
import { seed } from "../../scripts/seed";

export const JIMWELL = "u_jimwell";
export const JIM = "u_jim";
export const JC = "u_jc";

export async function resetDb() {
  await getPool().query("TRUNCATE shares, documents, users CASCADE");
  await seed(getPool(), { withWelcomeDoc: false });
}

/** Inserts a real session row for the user and returns a cookie header carrying its token. */
export async function sessionCookie(userId: string, { expired = false } = {}) {
  const token = randomBytes(32).toString("base64url");
  await getPool().query(
    `INSERT INTO sessions (token, user_id, expires_at) VALUES ($1, $2, now() + ($3 || ' days')::interval)`,
    [token, userId, expired ? "-1" : "7"],
  );
  return `ajaia_session=${token}`;
}

// Each route types its own params; `never` lets one helper call any of them.
type AnyHandler = (req: Request, ctx: never) => Promise<Response>;

/** Calls a Next.js route handler directly with a real Request, signed in as `as` via a real session (or with a raw `cookie`). */
export async function call(
  handler: AnyHandler,
  opts: {
    method?: string;
    as?: string;
    cookie?: string;
    json?: unknown;
    params?: Record<string, string>;
    body?: BodyInit;
  } = {},
) {
  const headers = new Headers();
  if (opts.as) headers.set("cookie", await sessionCookie(opts.as));
  if (opts.cookie) headers.set("cookie", opts.cookie);
  if (opts.json !== undefined) headers.set("content-type", "application/json");
  const req = new Request("http://test.local/api", {
    method: opts.method ?? "GET",
    headers,
    body: opts.json !== undefined ? JSON.stringify(opts.json) : opts.body,
  });
  const res = await handler(req, { params: Promise.resolve(opts.params ?? {}) } as never);
  const text = await res.text();
  const isJson = res.headers.get("content-type")?.includes("application/json");
  return { status: res.status, body: isJson && text ? JSON.parse(text) : null, raw: text, headers: res.headers };
}
