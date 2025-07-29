import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { pool } from "@/lib/db";
import { pool } from "@/lib/db";

/* ------------------------------------------------------------------ */
/*  Signing key                                                       */
/* ------------------------------------------------------------------ */
/* ------------------------------------------------------------------ */
/*  Signing key                                                       */
/* ------------------------------------------------------------------ */
const key = new TextEncoder().encode(process.env.AUTH_SIGNING_KEY);

/* ------------------------------------------------------------------ */
/*  Build an “env users” array from .env so we don’t hard‑code creds   */
/* ------------------------------------------------------------------ */
function loadEnvUsers() {
  const users: { email: string; password: string; id: string }[] = [];

  for (let i = 1; i <= 5; i++) {
    const email = process.env[`AUTH_EMAIL_${i}`];
    const hash  = process.env[`AUTH_HASH_${i}`];
    if (email && hash) users.push({ email, password: hash, id: `env-${i}` });
  }
  return users;
}
const envUsers = loadEnvUsers();

// src/lib/auth.ts (add at the top of the file)
export type VerifyCredsResult =
  | { ok: true; user: { id: string; email: string } }
  | { ok: false; reason: "no_user" | "bad_pw" };

/* ------------------------------------------------------------------ */
/*  Verify login credentials                                          */
/* ------------------------------------------------------------------ */
export async function verifyCreds( email: string, pw: string,): Promise<VerifyCredsResult> {
  /* 1‑‑‑ Try the database first ------------------------------------ */
  try {
    const { rows } = await pool.query<
      { id: number; password_hash: string }
    >(
      `SELECT id, password_hash
         FROM public.users
        WHERE LOWER(username) = LOWER($1)
        LIMIT 1`,
      [email],
    );

    if (!rows.length) {
      return { ok: false, reason: "no_user" } as const;
    }

    const ok = await bcrypt.compare(pw, rows[0].password_hash);
    if (ok) {
      return { ok: true, user: { id: rows[0].id.toString(), email } } as const;
    }
    return { ok: false, reason: "bad_pw" } as const;
  } catch (err) {
    console.error("[verifyCreds] DB error:", err);
    // fall through to env‑users; don’t throw so login still works offline
  }

  /* 2‑‑‑ Fallback to users defined in .env -------------------------- */
  const env = envUsers.find(
    (x) => x.email.toLowerCase() === email.toLowerCase(),
  );
  if (!env) return { ok: false, reason: "no_user" } as const;

  const ok = await bcrypt.compare(pw, env.password);
  return ok
    ? { ok: true, user: { id: env.id, email: env.email } }
    : { ok: false, reason: "bad_pw" };
}

/* ------------------------------------------------------------------ */
/*  JWT helpers (unchanged)                                           */
/* ------------------------------------------------------------------ */
/* ------------------------------------------------------------------ */
/*  JWT helpers (unchanged)                                           */
/* ------------------------------------------------------------------ */
export async function signToken(payload: { email: string }) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("7d")
    .sign(key);
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("7d")
    .sign(key);
}

export async function validateToken(token?: string) {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, key);
    return payload as { email: string };
  } catch {
    return null;
  }
}

/** ------------------------------------------------------------------ */
/**  Create a new user (sign‑up)                                      */
/** ------------------------------------------------------------------ */
export async function createUser(email: string, pw: string) {
  const { rows: exists } = await pool.query(
    "SELECT 1 FROM public.users WHERE username = $1",
    [email],
  );
  if (exists.length) return null;

  const hash = await bcrypt.hash(pw, 10);
  const { rows } = await pool.query(
    `INSERT INTO public.users (username, password_hash)
     VALUES ($1, $2)
     RETURNING id, username`,
    [email, hash],
  );
  return { id: rows[0].id.toString(), email: rows[0].username };
}