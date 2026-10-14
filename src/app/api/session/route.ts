import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { SESSION_COOKIE } from "@/lib/session";
import { jsonError } from "@/lib/http";

// Sign in as one of the seeded users (mocked auth).
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const userId = typeof body?.userId === "string" ? body.userId : "";
  const { rowCount } = await pool.query("SELECT 1 FROM users WHERE id = $1", [userId]);
  if (!rowCount) return jsonError(400, "Unknown user.");

  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, userId, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 7 });
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete(SESSION_COOKIE);
  return res;
}
