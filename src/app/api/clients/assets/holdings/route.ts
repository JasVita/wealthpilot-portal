// curl -s 'http://localhost:3001/api/clients/assets/holdings?client_id=51'
// curl -s 'http://localhost:3001/api/clients/assets/holdings?client_id=51&custodian=UBS&to=2025-06-30'
// curl -s 'http://localhost:3001/api/clients/assets/holdings?client_id=51&account=530-312828-01'
// curl -s 'http://localhost:3001/api/clients/assets/holdings?client_id=51&custodian=UBS&account=530-312828-01'

import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function intOrUndef(v: any) {
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams;

    const clientId = intOrUndef(sp.get("client_id"));
    if (!clientId) return NextResponse.json({ error: "client_id is required" }, { status: 400 });

    const to        = sp.get("to"); // 'YYYY-MM-DD' or null
    const custodian = sp.get("custodian"); // null or string
    const account   = sp.get("account");   // null or string

    const pool = getPool();
    const { rows } = await pool.query<{ json: any }>(
      `select public.get_holdings_snapshot_aggregated($1,$2,$3,$4) as json`,
      [clientId, to, custodian, account]
    );

    // Shape the response the holdings page expects (overview_data[...] with tableData)
    const payload = rows?.[0]?.json ?? { tableData: [] };

    return NextResponse.json({
      status: "ok",
      overview_data: [
        {
          month_date: to ?? null, // not used on UI now, but keep for a stable shape
          pie_chart_data: { charts: [] },
          table_data: { tableData: payload.tableData ?? [] },
        },
      ],
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    console.error("[api/clients/assets/holdings] error:", e);
    return NextResponse.json({ status: "error", message: "failed" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  // pass-through to GET semantics
  const body = await req.json().catch(() => ({} as any));
  const url = new URL(req.url);
  if (body?.client_id != null) url.searchParams.set("client_id", String(body.client_id));
  if (body?.to != null)        url.searchParams.set("to", String(body.to));
  if (body?.custodian != null) url.searchParams.set("custodian", String(body.custodian));
  if (body?.account != null)   url.searchParams.set("account", String(body.account));
  return GET(new NextRequest(url));
}
