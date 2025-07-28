import { NextResponse } from "next/server";
import { verifyCreds } from "@/lib/auth";
import { signToken } from "@/lib/auth-token";

const isProd = process.env.NODE_ENV === "production";

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();
    console.log("[login] attempt by:", email);

    /* ───────────────────────────────────────────────────── */
    /* 1. verify credentials                                */
    /* ───────────────────────────────────────────────────── */
    const user = await verifyCreds(email, password);
    if (!user) {
      console.log("[login] invalid credentials:", email);
      return NextResponse.json(
        { success: false, message: "Incorrect email or password." },
        { status: 401 },
      );
    }

    /* ───────────────────────────────────────────────────── */
    /* 2. sign JWT & build response                          */
    /* ───────────────────────────────────────────────────── */
    const token   = await signToken({ email: user.email });
    const res     = NextResponse.json({ success: true, user });

    /* 3. attach cookie to that response                    */
    res.cookies.set({
      name:     "auth",
      value:    token,
      httpOnly: true,
      secure:   isProd,
      sameSite: isProd ? "none" : "lax",
      path:     "/",
      maxAge:   60 * 60 * 24 * 7,   // 7 days
    });

    console.log("[login] auth cookie set for:", email);
    return res;
  } catch (err) {
    console.error("[login] server error:", err);
    return NextResponse.json(
      { success: false, message: "Server error" },
      { status: 500 },
    );
  }
}