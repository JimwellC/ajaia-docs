import { Pool } from "pg";
import { migrate } from "../scripts/migrate";
import { poolConfig } from "../src/lib/db-config";

export default async function setup() {
  const url = process.env.TEST_DATABASE_URL;
  if (!url) {
    console.log("TEST_DATABASE_URL not set: skipping integration tests.");
    return;
  }
  const pool = new Pool(poolConfig(url));
  await migrate(pool, () => {});
  await pool.end();
}
