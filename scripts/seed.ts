import type { Pool } from "pg";

export const SEED_USERS = [
  { id: "u_alice", email: "alice@ajaia.test", name: "Alice Reyes" },
  { id: "u_bob", email: "bob@ajaia.test", name: "Bob Santos" },
  { id: "u_carol", email: "carol@ajaia.test", name: "Carol Cruz" },
];

/** Inserts demo users and one welcome document. Safe to run repeatedly. */
export async function seed(pool: Pool, { withWelcomeDoc = true } = {}) {
  for (const u of SEED_USERS) {
    await pool.query(
      "INSERT INTO users (id, email, name) VALUES ($1, $2, $3) ON CONFLICT (email) DO NOTHING",
      [u.id, u.email, u.name],
    );
  }
  if (!withWelcomeDoc) return;
  await pool.query(
    `INSERT INTO documents (id, title, content, owner_id) VALUES ($1, $2, $3, 'u_alice') ON CONFLICT (id) DO NOTHING`,
    [
      "d_welcome",
      "Welcome to Ajaia Docs",
      "<h1>Welcome</h1><p>This document is owned by <strong>Alice</strong> and shared with <em>Bob</em> as an editor and <em>Carol</em> as a viewer.</p><ul><li><p>Try <u>formatting</u> text</p></li><li><p>Rename the document from the title field</p></li></ul>",
    ],
  );
  // Demo grants: Bob can edit, Carol can only view. Existing grants are left untouched.
  await pool.query(
    "INSERT INTO shares (document_id, user_id, role) VALUES ('d_welcome', 'u_bob', 'editor'), ('d_welcome', 'u_carol', 'viewer') ON CONFLICT DO NOTHING",
  );
}
