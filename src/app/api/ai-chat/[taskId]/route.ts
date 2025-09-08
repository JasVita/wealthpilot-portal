import { NextRequest, NextResponse } from "next/server";

const API =
  process.env.NEXT_PUBLIC_API_URL ??
  process.env.API_URL ??
  "http://localhost:5002"; // dev fallback

// In Next 15, params is a Promise — await it before use
export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ taskId: string }> }
) {
  const { taskId } = await context.params; // <-- FIX: await params

  if (!taskId) {
    return NextResponse.json({ status: "error", message: "task_id required" }, { status: 400 });
  }

  try {
    const res = await fetch(`${API}/ai-chat/${taskId}`, { method: "GET" });
    const text = await res.text();
    let data: any;
    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text };
    }
    return NextResponse.json(data, { status: res.status });
  } catch (e: any) {
    return NextResponse.json({ status: "error", message: e?.message || "proxy error" }, { status: 500 });
  }
}
