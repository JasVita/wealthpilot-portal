import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function intOrUndef(v: any) {
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

async function fetchDetails(docId: number, sections?: string) {
  const pool = getPool();

  // Try 2-arg version first
  try {
    const q = await pool.query<{ data: any }>(
      "select public.get_document_details($1, $2)::jsonb as data",
      [docId, sections ?? null]
    );
    if (q.rowCount && q.rows[0]?.data) return q.rows[0].data;
  } catch {
    /* fall through */
  }

  // Fallback 1-arg version
  const q2 = await pool.query<{ data: any }>(
    "select public.get_document_details($1)::jsonb as data",
    [docId]
  );
  return q2.rows[0]?.data ?? null;
}

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ docId: string }> }   // ⬅️ params is a Promise
) {
  const { docId: docIdStr } = await ctx.params;  // ⬅️ await it
  const docId = intOrUndef(docIdStr);
  if (!docId) {
    return NextResponse.json({ error: "docId must be a number" }, { status: 400 });
  }

  const sections = req.nextUrl.searchParams.get("sections") ?? undefined;

  try {
    const data = await fetchDetails(docId, sections);
    if (!data?.info) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }
    return NextResponse.json(data);
  } catch (e) {
    console.error("[documents details] error:", e);
    return NextResponse.json({ error: "Failed to load document" }, { status: 500 });
  }
}
