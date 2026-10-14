// Mocked authentication: the signed-in user id lives in an httpOnly cookie.
// Reading it from the Request (not next/headers) keeps route handlers testable.
import { AppError } from "./errors";
import { findUserById, type User } from "./repo";

export const SESSION_COOKIE = "ajaia_uid";

export function readSessionId(cookieHeader: string | null): string | null {
  if (!cookieHeader) return null;
  for (const part of cookieHeader.split(";")) {
    const [k, ...v] = part.trim().split("=");
    if (k === SESSION_COOKIE) return decodeURIComponent(v.join("="));
  }
  return null;
}

export async function getUserFromSessionId(id: string | null | undefined): Promise<User | null> {
  return id ? findUserById(id) : null;
}

export async function requireUser(req: Request): Promise<User> {
  const user = await getUserFromSessionId(readSessionId(req.headers.get("cookie")));
  if (!user) throw new AppError("unauthenticated", "Please sign in.");
  return user;
}
