import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { pool } from "@/lib/db";

/* ------------------------------------------------------------------ */
/*  Signing key                                                       */
/* ------------------------------------------------------------------ */
const key = new TextEncoder().encode(process.env.AUTH_SIGNING_KEY);

const users = [
  {
    email: "turoid",
    password: "$2b$10$8wZCIXHctrgpcerVViRt5u/umWpx3Fae4VgFTCnSaAkqI6bBJ2J6O",
    id: "1",
  },
  {
    email: "info@inspirocapital.org",
    password: "$2b$10$m0DJQjTMazHP7UeD26UMXOvJM0LEUuYW0vWa38SDImWrze/gKWCmu",
    id: "2",
  },
  {
    email: "vincci.lau@lavintoll.com",
    password: "$2b$10$5Tw0bnFXF9IQG4obZTwJ2eCJGPCTcKFYqGe0aOjJZF3L41iJpASnS",
    id: "3",
  },
];

export async function verifyCreds(email: string, pw: string) {
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

    if (rows.length) {
      const ok = await bcrypt.compare(pw, rows[0].password_hash);
      if (ok) return { id: rows[0].id.toString(), email };
    }
  } catch (err) {
    console.error("[verifyCreds] DB error:", err);
    // fall through to env‑users; don’t throw so login still works offline
  }

  /* 2‑‑‑ Fallback to users defined in .env -------------------------- */
  const u = envUsers.find((x) => x.email.toLowerCase() === email.toLowerCase());
  if (u && (await bcrypt.compare(pw, u.password))) {
    return { id: u.id, email: u.email };
  }

  /* 3‑‑‑ Nothing matched                                             */
  return null;
}

/* ------------------------------------------------------------------ */
/*  JWT helpers (unchanged)                                           */
/* ------------------------------------------------------------------ */
export async function signToken(payload: { email: string }) {
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
  // block duplicates
  const { rowCount } = await pool.query(
    `SELECT 1 FROM public.users WHERE username = $1`,
    [email],
  );
  if (rowCount) return null;

  const hash = await bcrypt.hash(pw, 10);

  const { rows } = await pool.query<{ id: number; username: string }>(
    `INSERT INTO public.users (username, password_hash)
     VALUES ($1, $2)
     RETURNING id, username`,
    [email, hash],
  );

  return { id: rows[0].id.toString(), email: rows[0].username };
}