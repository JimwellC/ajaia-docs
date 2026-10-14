// Runs migrations and seeds demo data. Safe to run more than once.
import { Pool } from "pg";
import { migrate } from "./migrate";
import { seed, SEED_USERS } from "./seed";
import { poolConfig } from "../src/lib/db-config";

async function main() {
  const pool = new Pool(poolConfig());
  await migrate(pool);
  await seed(pool);
  console.log("Database ready. Seeded users:", SEED_USERS.map((u) => u.email).join(", "));
  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
