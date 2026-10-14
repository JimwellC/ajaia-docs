import { Pool } from "pg";
import { poolConfig } from "./db-config";

const globalForPool = globalThis as unknown as { pgPool?: Pool };

// Created lazily so importing this module never needs a database (useful for builds and unit tests).
export function getPool(): Pool {
  if (!globalForPool.pgPool) globalForPool.pgPool = new Pool(poolConfig());
  return globalForPool.pgPool;
}
