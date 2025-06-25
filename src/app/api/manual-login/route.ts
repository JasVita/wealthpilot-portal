import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const AUTH_EMAIL = process.env.AUTH_EMAIL!;
const AUTH_PASSWORD = process.env.AUTH_PASSWORD!;
const AUTH_COOKIE_SECRET = process.env.AUTH_COOKIE_SECRET!; // some long random string

export async function POST(req: Request) {
  const { email, password } = await req.json();

  if (!email || !password) {
    return NextResponse.json({ message: "Missing email or password." }, { status: 400 });
  }

  if (email !== AUTH_EMAIL || password !== AUTH_PASSWORD) {
    return NextResponse.json({ message: "Incorrect email or password." }, { status: 401 });
  }

  (await cookies()).set("auth", AUTH_COOKIE_SECRET, {
    httpOnly: true,
    secure: process.env.ENV === "prod",
    sameSite: process.env.ENV === "dev" ? "lax" : "none",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });

  return NextResponse.json({ success: true });
}
