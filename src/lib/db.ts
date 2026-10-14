import { Pool } from "pg";

const globalForPool = globalThis as unknown as { pgPool?: Pool };

function createPool() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  return new Pool({
    connectionString: url,
    ssl: url.includes("sslmode=require") ? { rejectUnauthorized: false } : undefined,
    max: 5,
  });
}

// Reuse one pool across hot reloads in dev and across invocations on a warm serverless instance.
export const pool = globalForPool.pgPool ?? createPool();
if (process.env.NODE_ENV !== "production") globalForPool.pgPool = pool;
