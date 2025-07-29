import { NextResponse } from "next/server";
import { createUser } from "@/lib/auth";

export const dynamic = "force-dynamic";  

export async function POST(req: Request) {
  const { email, password } = await req.json();
  if (!email || !password)
    return NextResponse.json({ message: "Missing fields" }, { status: 400 });

  const user = await createUser(email, password);
  if (!user)
    return NextResponse.json({ message: "User exists" }, { status: 409 });

  return NextResponse.json({ success: true, user }, { status: 201 });
}
