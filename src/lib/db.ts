// src/lib/db.ts
import { Pool } from "pg";

function must(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var ${name}`);
  return v;
}

// cache across hot reloads
declare global {
  // eslint-disable-next-line no-var
  var __WP_PG_POOL__: Pool | undefined;
}

/** Call this in your route-handlers instead of using `new Pool()` */
export function getPool(): Pool {
  if (!global.__WP_PG_POOL__) {
    global.__WP_PG_POOL__ = new Pool({
      host: must("DB_HOST"),
      port: Number(process.env.DB_PORT ?? 5432),
      user: must("DB_USER"),
      password: must("DB_PASSWORD"),
      database: must("DB_NAME"),
      ssl: { rejectUnauthorized: false },
    });
  }
  return global.__WP_PG_POOL__;
}
