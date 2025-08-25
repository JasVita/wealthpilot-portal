// curl -s 'http://localhost:3001/api/clients/assets/holdings/months?client_id=32'
import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function intOrUndef(v: any) {
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

async function getMonths(clientId: number): Promise<string[]> {
  const pool = getPool();
  // returns months that actually have documents, newest first e.g. ["2025-07","2025-05",...]
  const q = await pool.query<{ ym: string }>(
    `
    select to_char(date_trunc('month', as_of_date), 'YYYY-MM') as ym
    from document
    where client_id = $1 and as_of_date is not null
    group by 1
    order by 1 desc
    `,
    [clientId]
  );
  return (q.rows ?? []).map(r => r.ym);
}

async function handler(req: NextRequest) {
  let clientId: number | undefined;

  if (req.method === "GET") {
    clientId = intOrUndef(req.nextUrl.searchParams.get("client_id"));
  } else {
    const body = await req.json().catch(() => ({} as any));
    clientId = intOrUndef(body?.client_id);
  }

  if (!clientId) {
    return NextResponse.json({ error: "client_id is required" }, { status: 400 });
  }

  const months = await getMonths(clientId);
  return NextResponse.json({ months });
}

export async function GET(req: NextRequest)  { return handler(req); }
export async function POST(req: NextRequest) { return handler(req); }
