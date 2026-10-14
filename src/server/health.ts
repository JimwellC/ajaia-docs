// Deployment health: is the database reachable, and has every migration on disk been applied?
import { listMigrationFiles } from "./migrations";
import { listAppliedMigrations } from "./repo";

const DB_TIMEOUT_MS = 5000;

export interface Health {
  ok: boolean;
  database: "ok" | "error";
  pendingMigrations: string[];
}

export async function checkHealth(): Promise<Health> {
  const files = listMigrationFiles();
  let applied: string[];
  try {
    applied = await Promise.race([
      listAppliedMigrations(),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error("database timeout")), DB_TIMEOUT_MS)),
    ]);
  } catch (e) {
    // Log the cause server-side only; the response never includes connection details.
    console.error("[health] database check failed:", (e as Error).message);
    // Unreachable database: nothing can be confirmed as applied.
    return { ok: false, database: "error", pendingMigrations: files };
  }
  const done = new Set(applied);
  const pendingMigrations = files.filter((f) => !done.has(f));
  return { ok: pendingMigrations.length === 0, database: "ok", pendingMigrations };
}
