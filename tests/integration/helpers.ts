import { getPool } from "@/lib/db";
import { seed } from "../../scripts/seed";

export const ALICE = "u_alice";
export const BOB = "u_bob";
export const CAROL = "u_carol";

export async function resetDb() {
  await getPool().query("TRUNCATE shares, documents, users CASCADE");
  await seed(getPool(), { withWelcomeDoc: false });
}

// Each route types its own params; `never` lets one helper call any of them.
type AnyHandler = (req: Request, ctx: never) => Promise<Response>;

/** Calls a Next.js route handler directly with a real Request, as a given user. */
export async function call(
  handler: AnyHandler,
  opts: { method?: string; as?: string; json?: unknown; params?: Record<string, string>; body?: BodyInit } = {},
) {
  const headers = new Headers();
  if (opts.as) headers.set("cookie", `ajaia_uid=${opts.as}`);
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
