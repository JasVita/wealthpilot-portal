import { NextResponse } from "next/server";
import { verifyCreds, VerifyCredsResult } from "@/lib/auth";
import { signToken } from "@/lib/auth-token";

export const dynamic = "force-dynamic"; 
const isProd = process.env.NODE_ENV === "production";

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();
    console.log("[login] attempt by:", email);

    /* 1. verify credentials */
    const result = await verifyCreds(email, password);

    if (!result.ok) {
      if (result.reason === "no_user") {
        console.log("[login] account not found:", email);
        return NextResponse.json(
          { success: false, message: "Account not found. Please sign up." },
          { status: 404 },
        );
      }
      console.log("[login] invalid password:", email);
      return NextResponse.json(
        { success: false, message: "Incorrect email or password." },
        { status: 401 },
      );
    }

    /* --- only reached when ok === true --- */
    // const { user } = result;
    const { user } = result as Exclude<typeof result, { ok: false }>;

    /* 2. sign JWT & build response */
    const token = await signToken({ email: user.email });
    const res   = NextResponse.json({ success: true, user });

    /* 3. attach cookie */
    res.cookies.set({
      name:     "auth",
      value:    token,
      httpOnly: true,
      secure:   isProd,
      sameSite: isProd ? "none" : "lax",
      path:     "/",
      maxAge:   60 * 60 * 24 * 7,
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
