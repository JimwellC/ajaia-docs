import { randomUUID } from "node:crypto";
import { pool } from "./db";
import type { DocAccessInfo } from "./access";

export interface DocSummary {
  id: string;
  title: string;
  updatedAt: string;
  ownerName: string;
}

export interface DocFull extends DocAccessInfo {
  id: string;
  title: string;
  content: string;
  ownerName: string;
  updatedAt: string;
  collaborators: { id: string; name: string; email: string }[];
}

export const MAX_TITLE = 120;
export const MAX_CONTENT_BYTES = 1_000_000;

export async function listDocuments(userId: string) {
  const owned = await pool.query<DocSummary>(
    `SELECT d.id, d.title, d.updated_at AS "updatedAt", u.name AS "ownerName"
       FROM documents d JOIN users u ON u.id = d.owner_id
      WHERE d.owner_id = $1 ORDER BY d.updated_at DESC`,
    [userId],
  );
  const shared = await pool.query<DocSummary>(
    `SELECT d.id, d.title, d.updated_at AS "updatedAt", u.name AS "ownerName"
       FROM shares s JOIN documents d ON d.id = s.document_id JOIN users u ON u.id = d.owner_id
      WHERE s.user_id = $1 ORDER BY d.updated_at DESC`,
    [userId],
  );
  return { owned: owned.rows, shared: shared.rows };
}

export async function getDocument(id: string): Promise<DocFull | null> {
  const { rows } = await pool.query(
    `SELECT d.id, d.title, d.content, d.owner_id AS "ownerId", d.updated_at AS "updatedAt",
            u.name AS "ownerName"
       FROM documents d JOIN users u ON u.id = d.owner_id WHERE d.id = $1`,
    [id],
  );
  const doc = rows[0];
  if (!doc) return null;
  const collab = await pool.query(
    `SELECT u.id, u.name, u.email FROM shares s JOIN users u ON u.id = s.user_id
      WHERE s.document_id = $1 ORDER BY u.name`,
    [id],
  );
  return {
    ...doc,
    collaborators: collab.rows,
    sharedWith: collab.rows.map((c: { id: string }) => c.id),
  };
}

export async function createDocument(ownerId: string, title?: string, content?: string) {
  const id = randomUUID();
  await pool.query(
    "INSERT INTO documents (id, title, content, owner_id) VALUES ($1, $2, $3, $4)",
    [id, (title || "Untitled document").slice(0, MAX_TITLE), content ?? "", ownerId],
  );
  return id;
}

export async function updateDocument(id: string, patch: { title?: string; content?: string }) {
  const { rows } = await pool.query(
    `UPDATE documents
        SET title = COALESCE($2, title), content = COALESCE($3, content), updated_at = now()
      WHERE id = $1 RETURNING updated_at AS "updatedAt"`,
    [id, patch.title ?? null, patch.content ?? null],
  );
  return rows[0]?.updatedAt as string | undefined;
}

export async function deleteDocument(id: string) {
  await pool.query("DELETE FROM documents WHERE id = $1", [id]);
}

export async function findUserByEmail(email: string) {
  const { rows } = await pool.query("SELECT id, name, email FROM users WHERE lower(email) = lower($1)", [
    email.trim(),
  ]);
  return rows[0] as { id: string; name: string; email: string } | undefined;
}

export async function addShare(documentId: string, userId: string) {
  await pool.query(
    "INSERT INTO shares (document_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
    [documentId, userId],
  );
}

export async function removeShare(documentId: string, userId: string) {
  await pool.query("DELETE FROM shares WHERE document_id = $1 AND user_id = $2", [documentId, userId]);
}
