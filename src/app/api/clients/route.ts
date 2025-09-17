// src/app/api/clients/route.ts
// curl -s 'http://localhost:3001/api/clients?user_id=1'
// curl -s 'http://localhost:3001/api/clients?user_id=1&date_to=2025-05-31'
// curl -s 'http://localhost:3001/api/clients?user_id=1&custodian=Bank+of+Singapore&date_to=2025-05-31'
import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/clients
 *
 * Returns a list of clients for the given user_id with summary totals
 * and minimal pieChartData, computed in a single set-based SQL call:
 *   public.get_user_clients_latest_overview(user_id, date_to, custodian)
 *
 * Optional query params:
 *   - user_id     (required)
 *   - date_to     (optional, 'YYYY-MM-DD', latest snapshot up to this date)
 *   - custodian   (optional, case-insensitive)
 */
export async function GET(req: NextRequest) {
  const userId = Number(req.nextUrl.searchParams.get("user_id"));
  if (!Number.isFinite(userId) || userId <= 0) {
    return NextResponse.json({ error: "user_id is required" }, { status: 400 });
  }

  const dateTo = req.nextUrl.searchParams.get("date_to");              // or null
  const custodian = req.nextUrl.searchParams.get("custodian") || null; // optional

  try {
    const pool = getPool();
    const { rows } = await pool.query<{ json: any }>(
      `select public.get_user_clients_latest_overview($1, $2, $3) as json`,
      [userId, dateTo, custodian]
    );

    // Shape: { clients: [...] }
    const payload = rows?.[0]?.json ?? { clients: [] };
    return NextResponse.json(payload, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    console.error("[/api/clients] error:", err);
    return NextResponse.json({ clients: [] }, { status: 200 });
  }
}

/**
 * POST /api/clients
 * Convenience passthrough for the same GET semantics.
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({} as any));
  const url = new URL(req.url);

  if (body?.user_id != null)   url.searchParams.set("user_id", String(body.user_id));
  if (body?.date_to != null)   url.searchParams.set("date_to", String(body.date_to));
  if (body?.custodian != null) url.searchParams.set("custodian", String(body.custodian));

  return GET(new NextRequest(url));
}
