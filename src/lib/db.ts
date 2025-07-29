// src/lib/db.ts
import { Pool } from "pg";

/* ------------------------------------------------------------------ */
/*  Helper – throws if an env‑var is missing                          */
/* ------------------------------------------------------------------ */
function must(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var ${name}`);
  return v;
}

/* ------------------------------------------------------------------ */
/*  Lazy singleton pool                                               */
/* ------------------------------------------------------------------ */
let _pool: Pool | null = null;

/** Call this in your route‑handlers instead of using `pool` directly */
export function getPool(): Pool {
  if (_pool) return _pool;               // already created

  _pool = new Pool({
    host: must("DB_HOST"),
    port: Number(process.env.DB_PORT ?? 5432),
    user: must("DB_USER"),
    password: must("DB_PASSWORD"),
    database: must("DB_NAME"),
    ssl: { rejectUnauthorized: false },
  });

  return _pool;
}
