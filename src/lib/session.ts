// Mocked authentication: the signed-in user id lives in a cookie.
// Good enough for a demo of ownership and sharing; not real auth.
import { cookies } from "next/headers";
import { pool } from "./db";

export const SESSION_COOKIE = "ajaia_uid";

export interface User {
  id: string;
  email: string;
  name: string;
}

export async function getCurrentUser(): Promise<User | null> {
  const uid = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!uid) return null;
  const { rows } = await pool.query<User>("SELECT id, email, name FROM users WHERE id = $1", [uid]);
  return rows[0] ?? null;
}

export async function listUsers(): Promise<User[]> {
  const { rows } = await pool.query<User>("SELECT id, email, name FROM users ORDER BY name");
  return rows;
}
