import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST() {
  const cookieStore = cookies();
  (await cookieStore).set({
    name: "auth",
    value: "",
    path: "/",
    maxAge: 0, // expires immediately
  });

  return NextResponse.json({ success: true });
}
