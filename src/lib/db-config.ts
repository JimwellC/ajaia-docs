import type { PoolConfig } from "pg";

export function poolConfig(url = process.env.DATABASE_URL): PoolConfig {
  if (!url) throw new Error("DATABASE_URL is not set");
  const useSsl = /sslmode=(require|verify-full|verify-ca)/.test(url);
  // Strip sslmode from the URL and configure SSL explicitly; this avoids pg's sslmode deprecation warning.
  const connectionString = url.replace(/([?&])sslmode=[^&]*&?/, "$1").replace(/[?&]$/, "");
  return { connectionString, ssl: useSsl ? { rejectUnauthorized: true } : undefined, max: 5 };
}
