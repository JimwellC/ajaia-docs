// Demo authentication with real server-side sessions: the cookie holds a random token,
// and the user is resolved only by looking that token up. A user id in a cookie means nothing.
// Reading it from the Request (not next/headers) keeps route handlers testable.
import { randomBytes } from "node:crypto";
import { AppError } from "./errors";
import { deleteSession, findUserBySessionToken, insertSession, type User } from "./repo";

export const SESSION_COOKIE = "ajaia_session";
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;

export function readSessionToken(cookieHeader: string | null): string | null {
  if (!cookieHeader) return null;
  for (const part of cookieHeader.split(";")) {
    const [k, ...v] = part.trim().split("=");
    if (k === SESSION_COOKIE) return decodeURIComponent(v.join("="));
  }
  return null;
}

/** Missing, unknown, and expired tokens all resolve to null. */
export async function getUserFromSessionToken(token: string | null | undefined): Promise<User | null> {
  return token ? findUserBySessionToken(token) : null;
}

export async function createSession(userId: string): Promise<string> {
  const token = randomBytes(32).toString("base64url");
  await insertSession(token, userId, SESSION_TTL_SECONDS);
  return token;
}

export async function endSession(token: string | null) {
  if (token) await deleteSession(token);
}

export async function requireUser(req: Request): Promise<User> {
  const user = await getUserFromSessionToken(readSessionToken(req.headers.get("cookie")));
  if (!user) throw new AppError("unauthenticated", "Please sign in.");
  return user;
}
