/**
 * src/lib/auth-token.ts
 * JWT helpers that work in the Edge runtime
 * (no pg, no bcrypt, no Node‑only crypto import)
 */
import { SignJWT, jwtVerify } from "jose";

const key = new TextEncoder().encode(
  process.env.AUTH_SIGNING_KEY ?? "dev-only-key",
);

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
