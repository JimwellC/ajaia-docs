// Migration files on disk, shared by the migration runner (scripts/migrate.ts) and the health check.
import { readdirSync } from "node:fs";
import { join } from "node:path";

export const MIGRATIONS_DIR = join(process.cwd(), "db/migrations");

/** Migration file names in the order they are applied. */
export function listMigrationFiles(dir = MIGRATIONS_DIR): string[] {
  return readdirSync(dir).filter((f) => f.endsWith(".sql")).sort();
}
