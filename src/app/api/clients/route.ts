// curl -s 'http://localhost:3001/api/clients?user_id=10'
import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type BankBlock = Record<string, any> & {
  bank?: string | null;
  account_number?: string | null;
  as_of_date?: string | null;
};

const r2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
const toNum = (v: any) => (Number.isFinite(Number(v)) ? Number(v) : 0);

function rowsOf(cat: any): any[] {
  if (!cat) return [];
  if (Array.isArray(cat)) return cat;
  if (Array.isArray(cat?.rows)) return cat.rows;
  return [];
}

function sumCategory(cat: any): number {
  if (!cat) return 0;
  if (typeof cat?.subtotalUsd === "number") return cat.subtotalUsd || 0;
  const rows = rowsOf(cat);
  return rows.reduce(
    (a: number, r: any) => a + (toNum(r?.balanceUsd ?? r?.balance) || 0),
    0
  );
}

function palette(n: number): string[] {
  const base = [
    "#60a5fa", "#34d399", "#a78bfa", "#fbbf24",
    "#f472b6", "#38bdf8", "#f87171", "#c084fc",
    "#f59e0b", "#10b981", "#22d3ee", "#ef4444",
  ];
  const out: string[] = [];
  for (let i = 0; i < n; i++) out.push(base[i % base.length]);
  return out;
}

/** ---- Month helpers (same as overview route) ---- */
async function getRecentMonths(clientId: number, limit = 12) {
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

async function fetchMonthTableData(clientId: number, y: number, m: number) {
  const pool = getPool();
  const q = await pool.query<{ data: any }>(
    "select public.get_month_overview_aggregated($1,$2,$3)::jsonb as data",
    [clientId, y, m]
  );
  return q.rows?.[0]?.data ?? { tableData: [] };
}

/** ---- Aggregator (same shape as /overview) ---- */
function buildAggregates(tableData: BankBlock[]) {
  const bankTotals = new Map<string, number>();
  tableData.forEach((b) => {
    const total =
      sumCategory(b.loans) +
      sumCategory(b.equity_funds ?? b.equities_fund) +
      sumCategory(b.direct_equities) +
      sumCategory(b.alternative_funds ?? b.alternative_fund) +
      sumCategory(b.fixed_income_funds) +
      sumCategory(b.direct_fixed_income) +
      sumCategory(b.structured_products) +
      sumCategory(b.cash_and_equivalents);
    const bank = (b.bank ?? "—").toString();
    bankTotals.set(bank, (bankTotals.get(bank) || 0) + total);
  });
  const bankLabels = Array.from(bankTotals.keys());
  const bankData = bankLabels.map((k) => bankTotals.get(k) || 0);

  const buckets: Array<[string, string[]]> = [
    ["Cash And Equivalents", ["cash_and_equivalents"]],
    ["Direct Fixed Income", ["direct_fixed_income"]],
    ["Fixed Income Funds", ["fixed_income_funds"]],
    ["Direct Equities", ["direct_equities"]],
    ["Equities Fund", ["equities_fund", "equity_funds"]],
    ["Alternative Fund", ["alternative_fund", "alternative_funds"]],
    ["Structured Product", ["structured_products"]],
    ["Loans", ["loans"]],
  ];
  const assetTotals = new Map<string, number>();
  tableData.forEach((b) => {
    for (const [pretty, variants] of buckets) {
      let s = 0;
      for (const v of variants) s += sumCategory((b as any)[v]);
      assetTotals.set(pretty, (assetTotals.get(pretty) || 0) + s);
    }
  });
  const assetLabels = buckets.map(([pretty]) => pretty);
  const assetData = assetLabels.map((k) => assetTotals.get(k) || 0);

  const ccyTotals = new Map<string, number>();
  tableData.forEach((b) => {
    for (const k of [
      "cash_and_equivalents", "direct_fixed_income", "fixed_income_funds",
      "direct_equities", "equities_fund", "equity_funds",
      "alternative_fund", "alternative_funds", "structured_products", "loans",
    ]) {
      for (const r of rowsOf((b as any)[k])) {
        const c = (r?.currency ?? "USD").toString();
        const v = toNum(r?.balanceUsd ?? r?.balance) || 0;
        ccyTotals.set(c, (ccyTotals.get(c) || 0) + v);
      }
    }
  });
  const ccySorted = Array.from(ccyTotals.entries()).sort((a, b) => b[1] - a[1]);
  const ccyLabels = ccySorted.map(([k]) => k);
  const ccyData = ccySorted.map(([, v]) => v);

  const grossAssets = assetLabels.filter((l) => l !== "Loans")
    .reduce((a, l) => a + (assetTotals.get(l) || 0), 0);
  const loans = assetTotals.get("Loans") || 0;
  const netAssets = grossAssets + loans;

  return {
    charts: [
      { title: "AUM_ratio", labels: bankLabels, data: bankData, colors: palette(bankLabels.length) },
      { title: "overall_asset_class_breakdown", labels: assetLabels, data: assetData, colors: palette(assetLabels.length) },
      { title: "overall_currency_breakdown", labels: ccyLabels, data: ccyData, colors: palette(ccyLabels.length) },
    ],
    totals: { grossAssets, loans, netAssets },
  };
}

/** ---- DB fetch for user’s clients ---- */
async function fetchClientsForUser(userId: number) {
  const pool = getPool();
  const q = await pool.query<{ id: number; name: string; code: string | null }>(
    `select id, name, code from public.client where user_id = $1 order by id desc`,
    [userId]
  );
  return q.rows ?? [];
}

/** ---- API handler ---- */
export async function GET(req: NextRequest) {
  // user_id may come as query ?user_id= or in POST body in other flows
  const userId = Number(req.nextUrl.searchParams.get("user_id"));
  if (!Number.isFinite(userId) || userId <= 0) {
    return NextResponse.json({ error: "user_id is required" }, { status: 400 });
  }

  const clients = await fetchClientsForUser(userId);

  // For each client, fetch latest month data and compute summary
  const out = [];
  for (const c of clients) {
    let totalCustodians = 0;
    let net = 0, assets = 0, debts = 0;

    const months = await getRecentMonths(c.id, 12);
    if (months.length) {
      // choose first month that actually has data
      let sel = months[0];
      let tableData: any = null;
      for (const cand of months) {
        const td = await fetchMonthTableData(c.id, cand.y, cand.m);
        const arr = Array.isArray(td?.tableData) ? td.tableData : [];
        if (arr.length) { sel = cand; tableData = td; break; }
      }
      if (!tableData) tableData = await fetchMonthTableData(c.id, sel.y, sel.m);

      const arr: BankBlock[] = Array.isArray(tableData?.tableData) ? tableData.tableData : [];
      totalCustodians = new Set(arr.map((b) => (b.bank ?? "—").toString())).size;

      const agg = buildAggregates(arr);
      assets = r2(agg.totals.grossAssets);
      // loans are usually negative -> return a positive "total_debts_usd"
      debts = r2(Math.abs(agg.totals.loans));
      net = r2(agg.totals.netAssets);

      out.push({
        id: String(c.id),
        name: c.name,
        pieChartData: { charts: agg.charts },     // optional: handy for thumbnails/previews
        summary: {
          code: c.code ?? undefined,
          total_custodians: totalCustodians,
          net_assets_usd: net,
          total_assets_usd: assets,
          total_debts_usd: debts,
          // the rest can be filled later from your profile UI
          rm: undefined,
          mandate_type: undefined,
          risk_profile: undefined,
          status: "opened",
          app_status: "opened",
          starred: false,
        },
      });
    } else {
      // no months/data – still return the client with zeros
      out.push({
        id: String(c.id),
        name: c.name,
        pieChartData: null,
        summary: {
          code: c.code ?? undefined,
          total_custodians: 0,
          net_assets_usd: 0,
          total_assets_usd: 0,
          total_debts_usd: 0,
          status: "opened",
          app_status: "opened",
          starred: false,
        },
      });
    }
  }

  return NextResponse.json({ clients: out });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({} as any));
  const userId = Number(body?.user_id);
  if (!Number.isFinite(userId) || userId <= 0) {
    return NextResponse.json({ error: "user_id is required" }, { status: 400 });
  }
  // delegate to GET to avoid duplicating logic
  const url = new URL(req.url);
  url.searchParams.set("user_id", String(userId));
  return GET(new NextRequest(url));
}
