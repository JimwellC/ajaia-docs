// All SQL lives here. Functions take plain values and return plain objects; no access checks.
import { randomUUID } from "node:crypto";
import { getPool } from "@/lib/db";
import type { AccessGrant, ShareRole } from "@/lib/access";

export interface User {
  id: string;
  email: string;
  name: string;
}

export interface DocSummary {
  id: string;
  title: string;
  updatedAt: string;
  ownerName: string;
  role?: ShareRole;
}

export interface DocRecord {
  id: string;
  title: string;
  content: string;
  ownerId: string;
  ownerName: string;
  version: number;
  updatedAt: string;
}

export interface Collaborator extends User {
  role: ShareRole;
}

const q = () => getPool();

export async function findUserById(id: string) {
  const { rows } = await q().query<User>("SELECT id, email, name FROM users WHERE id = $1", [id]);
  return rows[0] ?? null;
}

export async function findUserByEmail(email: string) {
  const { rows } = await q().query<User>("SELECT id, email, name FROM users WHERE lower(email) = lower($1)", [email]);
  return rows[0] ?? null;
}

export async function insertSession(token: string, userId: string, ttlSeconds: number) {
  await q().query(
    "INSERT INTO sessions (token, user_id, expires_at) VALUES ($1, $2, now() + make_interval(secs => $3))",
    [token, userId, ttlSeconds],
  );
}

/** The user behind a session token, or null if the token is unknown or expired. */
export async function findUserBySessionToken(token: string) {
  const { rows } = await q().query<User>(
    `SELECT u.id, u.email, u.name FROM sessions s JOIN users u ON u.id = s.user_id
      WHERE s.token = $1 AND s.expires_at > now()`,
    [token],
  );
  return rows[0] ?? null;
}

export async function deleteSession(token: string) {
  await q().query("DELETE FROM sessions WHERE token = $1", [token]);
}

/** Names of applied migrations, or [] if the tracking table doesn't exist yet. */
export async function listAppliedMigrations() {
  try {
    const { rows } = await q().query<{ name: string }>("SELECT name FROM schema_migrations");
    return rows.map((r) => r.name);
  } catch (e) {
    if ((e as { code?: string }).code === "42P01") return []; // undefined_table
    throw e;
  }
}

export async function listUsers() {
  const { rows } = await q().query<User>("SELECT id, email, name FROM users ORDER BY name");
  return rows;
}

export async function listOwned(userId: string) {
  const { rows } = await q().query<DocSummary>(
    `SELECT d.id, d.title, d.updated_at AS "updatedAt", u.name AS "ownerName"
       FROM documents d JOIN users u ON u.id = d.owner_id
      WHERE d.owner_id = $1 ORDER BY d.updated_at DESC`,
    [userId],
  );
  return rows;
}

export async function listSharedWith(userId: string) {
  const { rows } = await q().query<DocSummary>(
    `SELECT d.id, d.title, d.updated_at AS "updatedAt", u.name AS "ownerName", s.role
       FROM shares s JOIN documents d ON d.id = s.document_id JOIN users u ON u.id = d.owner_id
      WHERE s.user_id = $1 ORDER BY d.updated_at DESC`,
    [userId],
  );
  return rows;
}

export async function findDocument(id: string) {
  const { rows } = await q().query<DocRecord>(
    `SELECT d.id, d.title, d.content, d.owner_id AS "ownerId", u.name AS "ownerName",
            d.version, d.updated_at AS "updatedAt"
       FROM documents d JOIN users u ON u.id = d.owner_id WHERE d.id = $1`,
    [id],
  );
  return rows[0] ?? null;
}

export async function listCollaborators(documentId: string) {
  const { rows } = await q().query<Collaborator>(
    `SELECT u.id, u.name, u.email, s.role FROM shares s JOIN users u ON u.id = s.user_id
      WHERE s.document_id = $1 ORDER BY u.name`,
    [documentId],
  );
  return rows;
}

export async function listGrants(documentId: string): Promise<AccessGrant[]> {
  const { rows } = await q().query<AccessGrant>(
    `SELECT user_id AS "userId", role FROM shares WHERE document_id = $1`,
    [documentId],
  );
  return rows;
}

export async function insertDocument(ownerId: string, title: string, content: string) {
  const id = randomUUID();
  await q().query("INSERT INTO documents (id, title, content, owner_id) VALUES ($1, $2, $3, $4)", [
    id,
    title,
    content,
    ownerId,
  ]);
  return id;
}

/**
 * Updates only if the stored version still matches what the client last saw.
 * Returns the new version and timestamp, or null when someone else saved first.
 */
export async function updateDocumentIfVersion(
  id: string,
  expectedVersion: number,
  patch: { title?: string; content?: string },
) {
  const { rows } = await q().query<{ version: number; updatedAt: string }>(
    `UPDATE documents
        SET title = COALESCE($3, title), content = COALESCE($4, content),
            version = version + 1, updated_at = now()
      WHERE id = $1 AND version = $2
      RETURNING version, updated_at AS "updatedAt"`,
    [id, expectedVersion, patch.title ?? null, patch.content ?? null],
  );
  return rows[0] ?? null;
}

export async function deleteDocument(id: string) {
  await q().query("DELETE FROM documents WHERE id = $1", [id]);
}

export async function insertShare(documentId: string, userId: string, role: ShareRole) {
  await q().query("INSERT INTO shares (document_id, user_id, role) VALUES ($1, $2, $3)", [documentId, userId, role]);
}

export async function updateShareRole(documentId: string, userId: string, role: ShareRole) {
  const { rowCount } = await q().query("UPDATE shares SET role = $3 WHERE document_id = $1 AND user_id = $2", [
    documentId,
    userId,
    role,
  ]);
  return (rowCount ?? 0) > 0;
}

export async function deleteShare(documentId: string, userId: string) {
  const { rowCount } = await q().query("DELETE FROM shares WHERE document_id = $1 AND user_id = $2", [
    documentId,
    userId,
  ]);
  return (rowCount ?? 0) > 0;
}

export interface PresenceEntry {
  id: string;
  name: string;
  role: "owner" | ShareRole;
  isTyping: boolean;
  cursorBlock: number | null;
}

export async function touchPresence(documentId: string, userId: string, typing: boolean, cursorBlock: number | null) {
  await q().query(
    `INSERT INTO document_presence (document_id, user_id, last_seen, typing_at, cursor_block)
     VALUES ($1, $2, now(), CASE WHEN $3 THEN now() END, $4)
     ON CONFLICT (document_id, user_id) DO UPDATE
       SET last_seen = now(), typing_at = CASE WHEN $3 THEN now() ELSE document_presence.typing_at END,
           cursor_block = $4`,
    [documentId, userId, typing, cursorBlock],
  );
}

/** Other members seen in the last 12 seconds; typing if they typed in the last 5. Never includes `exceptUserId`. */
export async function listPresence(documentId: string, exceptUserId: string) {
  const { rows } = await q().query<PresenceEntry>(
    `SELECT u.id, u.name,
            CASE WHEN d.owner_id = u.id THEN 'owner' ELSE s.role END AS role,
            COALESCE(p.typing_at > now() - interval '5 seconds', false) AS "isTyping",
            p.cursor_block AS "cursorBlock"
       FROM document_presence p
       JOIN users u ON u.id = p.user_id
       JOIN documents d ON d.id = p.document_id
       LEFT JOIN shares s ON s.document_id = p.document_id AND s.user_id = p.user_id
      WHERE p.document_id = $1 AND p.user_id <> $2
        AND p.last_seen > now() - interval '12 seconds'
        AND (d.owner_id = u.id OR s.user_id IS NOT NULL)
      ORDER BY u.name`,
    [documentId, exceptUserId],
  );
  return rows;
}
