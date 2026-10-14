import { NextResponse } from "next/server";
import { createSession, endSession, readSessionToken, SESSION_COOKIE, SESSION_TTL_SECONDS } from "@/server/auth";
import { AppError } from "@/server/errors";
import { readJson, route } from "@/server/handler";
import { findUserById } from "@/server/repo";
import { parse, sessionSchema } from "@/server/validation";

// Demo sign-in as one of the seeded users. Issues a server-side session; the cookie holds only its token.
export const POST = route(async (req) => {
  const { userId } = parse(sessionSchema, await readJson(req));
  if (!(await findUserById(userId))) throw new AppError("validation", "Unknown user.");
  const token = await createSession(userId);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
  return res;
});

export const DELETE = route(async (req) => {
  await endSession(readSessionToken(req.headers.get("cookie")));
  const res = NextResponse.json({ ok: true });
  res.cookies.delete(SESSION_COOKIE);
  return res;
});
