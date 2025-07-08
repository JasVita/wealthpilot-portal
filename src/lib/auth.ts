import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";

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
];

export async function verifyCreds(email: string, pw: string) {
  const u = users.find((x) => x.email === email);
  return u && (await bcrypt.compare(pw, u.password)) ? { id: u.id, email } : null;
}

export async function signToken(payload: { email: string }) {
  return await new SignJWT(payload).setProtectedHeader({ alg: "HS256" }).setExpirationTime("7d").sign(key);
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
