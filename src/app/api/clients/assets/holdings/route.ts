// curl -s 'http://localhost:3001/api/clients/assets/holdings?client_id=32'
// curl -s 'http://localhost:3001/api/clients/assets/holdings?client_id=32&year=2025&month=5'
import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* --------------------- helpers --------------------- */
function intOrUndef(v: any) {
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

const CANON_KEYS = [
  "cash_and_equivalents",
  "direct_fixed_income",
  "fixed_income_funds",
  "direct_equities",
  "equity_funds",      // plural
  "equities_fund",     // legacy
  "alternative_funds", // plural
  "alternative_fund",  // legacy
  "structured_products",
  "loans",
] as const;

/* ----------- helpers to ensure ticker/isin fields ----------- */
function parseTickerIsin(extra: unknown): { ticker?: string; isin?: string } {
  if (!extra) return {};
  const s = String(extra);
  const out: { ticker?: string; isin?: string } = {};

  // match "Ticker: NVDA" (case-insensitive), allow dots/dashes
  const t = s.match(/ticker\s*:\s*([A-Za-z0-9.\-]+)/i);
  if (t?.[1]) out.ticker = t[1].toUpperCase();

  // match "ISIN: US67066G1040"
  const i = s.match(/isin\s*:\s*([A-Za-z0-9]+)/i);
  if (i?.[1]) out.isin = i[1].toUpperCase();

  return out;
}

function rowsArray(x: any): any[] {
  const arr = Array.isArray(x) ? x : Array.isArray(x?.rows) ? x.rows : [];
  return arr.map((r: any) => {
    // prefer explicit fields; else parse from r.extra (or r?.extra-like)
    const parsed = parseTickerIsin(r?.extra ?? r?.Extra ?? r?.details ?? r?.info);

    // normalize ticker / isin casing & fallbacks
    const ticker =
      (r?.ticker ?? r?.Ticker ?? parsed.ticker ?? null) &&
      String(r?.ticker ?? r?.Ticker ?? parsed.ticker).toUpperCase();

    const isin =
      (r?.isin ?? r?.ISIN ?? parsed.isin ?? null) &&
      String(r?.isin ?? r?.ISIN ?? parsed.isin).toUpperCase();

    // normalize USD balance (keep original fields too)
    const balance =
      typeof r.balance === "number" ? r.balance
      : typeof r.balance_usd === "number" ? r.balance_usd
      : typeof r.balanceUsd === "number" ? r.balanceUsd
      : typeof r.balance_in_currency === "number" ? r.balance_in_currency
      : 0;

    return {
      ...r,
      // keep the canonicalized fields alongside originals
      ticker: ticker ?? null,
      isin: isin ?? null,
      balance,
    };
  });
}

function normalizeToCompat(raw: any) {
  // Already the new shape?
  if (raw && Array.isArray(raw.tableData)) return { tableData: raw.tableData };

  // Old overview-like shape
  const first = raw?.overview_data?.[0] ?? raw?.overview?.[0] ?? raw?.data?.[0] ?? raw?.[0] ?? null;
  const banks: any[] = first?.table_data?.tableData ?? raw?.table_data?.tableData ?? [];

  const normalized = banks.map((b: any) => {
    const out: Record<string, any> = {
      bank: b.bank ?? b.bankname ?? b.custodian ?? "—",
      as_of_date: b.as_of_date ?? first?.as_of_date ?? null,
      account_number: b.account_number ?? null,
    };
    for (const k of CANON_KEYS) if (b[k] !== undefined) out[k] = rowsArray(b[k]);
    if (!out["equity_funds"] && b["equities_fund"]     !== undefined) out["equity_funds"]     = rowsArray(b["equities_fund"]);
    if (!out["alternative_funds"] && b["alternative_fund"] !== undefined) out["alternative_funds"] = rowsArray(b["alternative_fund"]);
    return out;
  });

  return { tableData: normalized };
}

/* Cache the existence check so we don't query pg catalogs every call */
let _appFuncChecked = false;
let _appFuncExists = false;

async function appHoldingsFunctionExists(): Promise<boolean> {
  if (_appFuncChecked) return _appFuncExists;
  const pool = getPool();
  try {
    // to_regprocedure returns NULL if the function (with signature) does not exist
    const q = await pool.query<{ ok: boolean }>(
      "select to_regprocedure('app.get_client_holdings(integer,integer,integer)') is not null as ok"
    );
    _appFuncExists = !!q.rows?.[0]?.ok;
  } catch {
    _appFuncExists = false;
  } finally {
    _appFuncChecked = true;
  }
  return _appFuncExists;
}

/* Get up to N recent months (year, month) that have any as_of_date for this client */
async function getRecentMonths(clientId: number, limit = 12): Promise<Array<{y:number,m:number}>> {
  const pool = getPool();
  const q = await pool.query<{ y: number; m: number }>(
    `
    with mon as (
      select date_trunc('month', as_of_date)::date as mon
      from document
      where client_id = $1 and as_of_date is not null
      group by 1
      order by mon desc
      limit $2
    )
    select extract(year from mon)::int as y,
           extract(month from mon)::int as m
    from mon
    order by y desc, m desc
    `,
    [clientId, limit]
  );
  return q.rows ?? [];
}

/* Try to fetch holdings for a specific (y,m): prefer app.func if present, else fallback */
async function fetchForMonth(clientId: number, y: number, m: number): Promise<{tableData:any[]}> {
  const pool = getPool();

  // 1) Preferred: app.get_client_holdings, only if the function exists
  if (await appHoldingsFunctionExists()) {
    try {
      const q = await pool.query<{ data: any }>(
        "select app.get_client_holdings($1, $2, $3)::jsonb as data",
        [clientId, y, m]
      );
      if (q.rowCount && q.rows[0]?.data) {
        const n = normalizeToCompat(q.rows[0].data);
        if (Array.isArray(n.tableData) && n.tableData.length) return n;
      }
    } catch (e) {
      // Expected on some DBs; keep log minimal
      console.warn("[holdings] app.get_client_holdings failed, using public fallback:", (e as any)?.code ?? e);
    }
  }

  // 2) Fallback: public.get_month_overview_aggregated
  try {
    const q = await pool.query<{ data: any }>(
      "select public.get_month_overview_aggregated($1, $2, $3)::jsonb as data",
      [clientId, y, m]
    );
    if (q.rowCount && q.rows[0]?.data) {
      const n = normalizeToCompat(q.rows[0].data);
      return n; // may be empty; caller will decide if we keep searching
    }
  } catch (e) {
    console.error("[holdings] get_month_overview_aggregated error:", e);
  }

  return { tableData: [] };
}

/* Main fetch that auto-picks latest non-empty month if year/month not provided */
async function fetchHoldings(clientId: number, year?: number, month?: number): Promise<{tableData:any[], y?:number, m?:number}> {
  // Case 1: explicit month → just fetch it
  if (year && month) {
    const res = await fetchForMonth(clientId, year, month);
    return { ...res, y: year, m: month };
  }

  // Case 2: auto-pick latest non-empty month from recent months
  const months = await getRecentMonths(clientId, 12);
  for (const { y, m } of months) {
    const res = await fetchForMonth(clientId, y, m);
    if ((res.tableData?.length ?? 0) > 0) return { ...res, y, m };
  }

  // If nothing non-empty, return latest month even if empty (so UI shows context)
  if (months.length) {
    const { y, m } = months[0];
    const res = await fetchForMonth(clientId, y, m);
    return { ...res, y, m };
  }

  // No months at all for this client
  return { tableData: [] };
}

/* --------------------- handler --------------------- */
async function handle(req: NextRequest) {
  let clientId: number | undefined;
  let year: number | undefined;
  let month: number | undefined;

  if (req.method === "GET") {
    const sp = req.nextUrl.searchParams;
    clientId = intOrUndef(sp.get("client_id"));
    year     = intOrUndef(sp.get("year"));
    month    = intOrUndef(sp.get("month"));
  } else {
    const body = await req.json().catch(() => ({} as any)); // read ONCE
    clientId = intOrUndef(body?.client_id);
    year     = intOrUndef(body?.year);
    month    = intOrUndef(body?.month);
  }

  if (!clientId) return NextResponse.json({ error: "client_id is required" }, { status: 400 });

  const { tableData, y, m } = await fetchHoldings(clientId, year, month);

  // month_date for UI (first day of selected month in UTC ISO)
  const month_date = (y && m) ? new Date(Date.UTC(y, m - 1, 1)).toISOString() : null;

  return NextResponse.json({
    overview_data: [
      {
        month_date,
        pie_chart_data: { charts: [] },   // pies are being removed on FE
        table_data: { tableData },
      },
    ],
    status: "ok",
  });
}

export async function GET(req: NextRequest)  { return handle(req); }
export async function POST(req: NextRequest) { return handle(req); }
