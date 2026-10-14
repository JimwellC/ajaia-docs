// Applies db/migrations/*.sql in order, once each, tracked in schema_migrations.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { Pool } from "pg";
import { listMigrationFiles, MIGRATIONS_DIR } from "../src/server/migrations";

export async function migrate(pool: Pool, log = console.log) {
  await pool.query(
    "CREATE TABLE IF NOT EXISTS schema_migrations (name TEXT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT now())",
  );
  const dir = MIGRATIONS_DIR;
  const files = listMigrationFiles(dir);
  const { rows } = await pool.query<{ name: string }>("SELECT name FROM schema_migrations");
  const applied = new Set(rows.map((r) => r.name));

  for (const file of files) {
    if (applied.has(file)) continue;
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(readFileSync(join(dir, file), "utf8"));
      await client.query("INSERT INTO schema_migrations (name) VALUES ($1)", [file]);
      await client.query("COMMIT");
      log(`Applied ${file}`);
    } catch (e) {
      await client.query("ROLLBACK");
      throw new Error(`Migration ${file} failed: ${(e as Error).message}`);
    } finally {
      client.release();
    }
  }
}
