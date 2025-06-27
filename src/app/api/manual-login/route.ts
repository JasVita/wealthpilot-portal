import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const AUTH_COOKIE_SECRET = process.env.AUTH_COOKIE_SECRET!; // some long random string

const AUTH_PAIRS = [
  { email: process.env.AUTH_EMAIL, password: process.env.AUTH_PASSWORD },
  { email: process.env.AUTH_EMAIL_2, password: process.env.AUTH_PASSWORD_2 },
  // { email: process.env.AUTH_EMAIL_3, password: process.env.AUTH_PASSWORD_3 },
];

export async function POST(req: Request) {
  const { email, password } = await req.json();

  if (!email || !password) {
    return NextResponse.json({ message: "Missing email or password." }, { status: 400 });
  }

  const isValid = AUTH_PAIRS.some((p) => p.email === email && p.password === password);

  if (!isValid) {
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
