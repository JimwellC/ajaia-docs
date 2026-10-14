import { NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/server/auth";
import { AppError } from "@/server/errors";
import { readJson, route } from "@/server/handler";
import { findUserById } from "@/server/repo";
import { parse, sessionSchema } from "@/server/validation";

// Sign in as one of the seeded users (mocked auth).
export const POST = route(async (req) => {
  const { userId } = parse(sessionSchema, await readJson(req));
  if (!(await findUserById(userId))) throw new AppError("validation", "Unknown user.");
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, userId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  return res;
});

export const DELETE = route(async () => {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete(SESSION_COOKIE);
  return res;
});
