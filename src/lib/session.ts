// Session helpers for server components (pages), which read cookies via next/headers.
import { cookies } from "next/headers";
import { getUserFromSessionToken, SESSION_COOKIE } from "@/server/auth";

export async function getCurrentUser() {
  return getUserFromSessionToken((await cookies()).get(SESSION_COOKIE)?.value);
}

export { listUsers, type User } from "@/server/repo";
