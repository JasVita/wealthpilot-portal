import { Pool } from "pg";

function must(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var ${name}`);
  return v;
}

export const pool = new Pool({
  host: must("DB_HOST"),
  port: Number(process.env.DB_PORT ?? 5432),
  user: must("DB_USER"),
  password: must("DB_PASSWORD"),
  database: must("DB_NAME"),
  ssl: { rejectUnauthorized: false },
});
