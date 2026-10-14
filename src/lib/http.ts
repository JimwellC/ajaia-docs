import { NextResponse } from "next/server";
import { getCurrentUser } from "./session";

export function jsonError(status: number, message: string) {
  return NextResponse.json({ error: message }, { status });
}

/** Returns the signed-in user, or a 401 response to return directly. */
export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) return { user: null, response: jsonError(401, "Please sign in.") } as const;
  return { user, response: null } as const;
}
