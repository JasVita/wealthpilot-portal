import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { verifyCreds, signToken } from "@/lib/auth";

export async function POST(req: Request) {
  const { email, password } = await req.json();
  const user = await verifyCreds(email, password);
  if (!user) {
    return NextResponse.json({ message: "Incorrect email or password." }, { status: 401 });
  }

  const token = await signToken({ email: user.email });
  (await cookies()).set("auth", token, {
    httpOnly: true,
    secure: process.env.ENV === "prod",
    sameSite: process.env.ENV === "dev" ? "lax" : "none",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });

  return NextResponse.json({ success: true, user });
}
