// Creates tables and seeds demo users. Safe to run more than once.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Pool } from "pg";

const SEED_USERS = [
  { id: "u_alice", email: "alice@ajaia.test", name: "Alice Reyes" },
  { id: "u_bob", email: "bob@ajaia.test", name: "Bob Santos" },
  { id: "u_carol", email: "carol@ajaia.test", name: "Carol Cruz" },
];

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  const pool = new Pool({
    connectionString: url,
    ssl: url.includes("sslmode=require") ? { rejectUnauthorized: false } : undefined,
  });

  await pool.query(readFileSync(join(process.cwd(), "db/schema.sql"), "utf8"));

  for (const u of SEED_USERS) {
    await pool.query(
      "INSERT INTO users (id, email, name) VALUES ($1, $2, $3) ON CONFLICT (email) DO NOTHING",
      [u.id, u.email, u.name],
    );
  }

  const { rowCount } = await pool.query("SELECT 1 FROM documents WHERE owner_id = 'u_alice'");
  if (!rowCount) {
    await pool.query(
      `INSERT INTO documents (id, title, content, owner_id) VALUES ($1, $2, $3, 'u_alice')`,
      [
        "d_welcome",
        "Welcome to Ajaia Docs",
        "<h1>Welcome</h1><p>This document is owned by <strong>Alice</strong> and shared with <em>Bob</em>.</p><ul><li><p>Try <u>formatting</u> text</p></li><li><p>Rename the document from the title field</p></li></ul>",
      ],
    );
    await pool.query("INSERT INTO shares (document_id, user_id) VALUES ('d_welcome', 'u_bob')");
  }

  console.log("Database ready. Seeded users:", SEED_USERS.map((u) => u.email).join(", "));
  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
