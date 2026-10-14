import type { Pool } from "pg";

export const SEED_USERS = [
  { id: "u_jimwell", email: "jimwell@ajaia.test", name: "Jimwell Calma" },
  { id: "u_jim", email: "jim@ajaia.test", name: "Jim" },
  { id: "u_jc", email: "jc@ajaia.test", name: "JC" },
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
    `INSERT INTO documents (id, title, content, owner_id) VALUES ($1, $2, $3, 'u_jimwell') ON CONFLICT (id) DO NOTHING`,
    [
      "d_welcome",
      "Welcome to Ajaia Docs",
      "<h1>Welcome</h1><p>This document is owned by <strong>Jimwell</strong> and shared with <em>Jim</em> as an editor and <em>JC</em> as a viewer.</p><ul><li><p>Try <u>formatting</u> text</p></li><li><p>Rename the document from the title field</p></li></ul>",
    ],
  );
  // Demo grants: Jim can edit, JC can only view. Existing grants are left untouched.
  await pool.query(
    "INSERT INTO shares (document_id, user_id, role) VALUES ('d_welcome', 'u_jim', 'editor'), ('d_welcome', 'u_jc', 'viewer') ON CONFLICT DO NOTHING",
  );
}
