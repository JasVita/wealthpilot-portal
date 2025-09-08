import { NextRequest, NextResponse } from "next/server";

const API =
  process.env.NEXT_PUBLIC_API_URL ??
  process.env.API_URL ??
  "http://localhost:5002"; // dev fallback

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const res = await fetch(`${API}/ai-chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const text = await res.text();
    let data: any;
    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text };
    }

    return NextResponse.json(data, { status: res.status });
  } catch (e: any) {
    console.error("[api/ai-chat] proxy error:", e?.message || e);
    return NextResponse.json({ status: "error", message: e?.message || "proxy error" }, { status: 500 });
  }
}
