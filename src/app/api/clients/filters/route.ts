// curl -s 'http://localhost:3001/api/clients/filters?client_id=44'
// curl -s 'http://localhost:3001/api/clients/filters?client_id=44&custodian=UBS'
// src/app/api/clients/filters/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams;
    const clientId = Number(sp.get("client_id"));
    const custodian = sp.get("custodian"); // optional
    const account = sp.get("account");      // optional

    if (!Number.isFinite(clientId) || clientId <= 0) {
      return NextResponse.json({ error: "client_id is required" }, { status: 400 });
    }

    const pool = getPool();
    const { rows } = await pool.query<{ data: any }>(
      `select public.get_client_filters($1,$2,$3)::jsonb as data`,
      [clientId, custodian, account]
    );

    const data = rows?.[0]?.data ?? {
      custodians: [],
      custodian_map: [],
      periods: [],
      min_date: null,
      max_date: null,
      accounts: []
    };

    return NextResponse.json(data, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    console.error("[api/clients/filters] error:", e);
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const url = new URL(req.url);
  if (body.client_id != null) url.searchParams.set("client_id", String(body.client_id));
  if (body.custodian != null) url.searchParams.set("custodian", String(body.custodian));
  if (body.account != null) url.searchParams.set("account", String(body.account));
  return GET(new NextRequest(url));
}
