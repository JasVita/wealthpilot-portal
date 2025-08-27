import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type BankBlock = Record<string, any> & {
  bank?: string | null;
  account_number?: string | null;
  as_of_date?: string | null;
};

function intOrUndef(v: any) {
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

/** round to 2 decimals */
const r2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

/** Sum a category block: prefer subtotalUsd, else sum rows[].balanceUsd/balance */
function sumCategory(cat: any): number {
  if (!cat) return 0;
  if (typeof cat.subtotalUsd === "number") return cat.subtotalUsd || 0;
  const rows = Array.isArray(cat) ? cat : Array.isArray(cat?.rows) ? cat.rows : [];
  return rows.reduce((a: number, r: any) => a + (Number(r?.balanceUsd ?? r?.balance ?? 0) || 0), 0);
}

/** Get rows[] from a category, normalized */
function rowsOf(cat: any): any[] {
  if (!cat) return [];
  if (Array.isArray(cat)) return cat;
  if (Array.isArray(cat.rows)) return cat.rows;
  return [];
}

/** Find recent months that have documents */
async function getRecentMonths(clientId: number, limit = 12): Promise<Array<{ y: number; m: number }>> {
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

/** Build chart datasets and also return granular totals we’ll reuse for cards/breakdown */
function buildAggregates(tableData: BankBlock[]) {
  // BANK AUM
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

  // ASSET BUCKET TOTALS (canonical -> sum USD)
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

  // CURRENCY SPLIT
  const ccyTotals = new Map<string, number>();
  tableData.forEach((b) => {
    for (const k of [
      "cash_and_equivalents", "direct_fixed_income", "fixed_income_funds", "direct_equities",
      "equities_fund", "equity_funds", "alternative_fund", "alternative_funds",
      "structured_products", "loans",
    ]) {
      for (const r of rowsOf((b as any)[k])) {
        const c = (r?.currency ?? "USD").toString();
        const v = Number(r?.balanceUsd ?? r?.balance ?? 0) || 0;
        ccyTotals.set(c, (ccyTotals.get(c) || 0) + v);
      }
    }
  });
  const ccySorted = Array.from(ccyTotals.entries()).sort((a, b) => b[1] - a[1]);
  const ccyLabels = ccySorted.map(([k]) => k);
  const ccyData = ccySorted.map(([, v]) => v);

  // CARDS
  const grossAssets = assetLabels
    .filter((l) => l !== "Loans")
    .reduce((a, l) => a + (assetTotals.get(l) || 0), 0);
  const loans = assetTotals.get("Loans") || 0;          // usually negative
  const netAssets = grossAssets + loans;                // assets + (negative loans)
  const aumFromBanks = bankData.reduce((a, b) => a + b, 0); // equals net assets if rows are consistent

  // BREAKDOWN (2 decimals)
  const breakdown: Record<string, number> = {};
  for (const l of assetLabels) breakdown[l] = r2(assetTotals.get(l) || 0);

  return {
    charts: [
      { title: "AUM_ratio", labels: bankLabels, data: bankData, colors: palette(bankLabels.length) },
      { title: "overall_asset_class_breakdown", labels: assetLabels, data: assetData, colors: palette(assetLabels.length) },
      { title: "overall_currency_breakdown", labels: ccyLabels, data: ccyData, colors: palette(ccyLabels.length) },
    ],
    totals: {
      grossAssets, loans, netAssets, aumFromBanks,
      breakdown
    }
  };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({} as any));
    const clientId = intOrUndef(body?.client_id);
    const year = intOrUndef(body?.year);
    const month = intOrUndef(body?.month);
    const monthDate: string | undefined = body?.month_date;

    if (!clientId) {
      return NextResponse.json({ status: "error", message: "client_id is required" }, { status: 400 });
    }

    let y = year, m = month;
    if (monthDate && (!y || !m)) {
      const d = new Date(monthDate);
      if (!isNaN(+d)) { y = d.getUTCFullYear(); m = d.getUTCMonth() + 1; }
    }

    const months = (!y || !m) ? await getRecentMonths(clientId, 12) : [{ y: y!, m: m! }];
    if (!months.length) return NextResponse.json({ status: "ok", overview_data: [], computed: null });

    // choose month with data (or first)
    let sel = months[0];
    let tableData: any = null;
    for (const cand of months) {
      const td = await fetchMonthTableData(clientId, cand.y, cand.m);
      const arr = Array.isArray(td?.tableData) ? td.tableData : [];
      if (arr.length > 0) { sel = cand; tableData = td; break; }
    }
    if (!tableData) tableData = await fetchMonthTableData(clientId, sel.y, sel.m);

    const month_date = new Date(Date.UTC(sel.y, sel.m - 1, 1)).toUTCString();
    const tableDataArr: BankBlock[] = Array.isArray(tableData?.tableData) ? tableData.tableData : [];

    // build pies + totals for cards/breakdown
    const agg = buildAggregates(tableDataArr);

    // trend over available months (same 12 we looked up)
    const trend = [];
    for (const cand of months) {
      const td = await fetchMonthTableData(clientId, cand.y, cand.m);
      const arr: BankBlock[] = Array.isArray(td?.tableData) ? td.tableData : [];
      const t = buildAggregates(arr);
      const label = new Date(Date.UTC(cand.y, cand.m - 1, 1)).toLocaleDateString("en-US", { month: "short", year: "numeric" });
      trend.push({ y: cand.y, m: cand.m, label, net_assets: r2(t.totals.netAssets) });
    }

    return NextResponse.json({
      status: "ok",
      overview_data: [
        { month_date, pie_chart_data: { charts: agg.charts }, table_data: { tableData: tableDataArr } }
      ],
      computed: {
        cards: {
          total_assets: r2(agg.totals.grossAssets),
          total_liabilities: r2(agg.totals.loans),
          net_assets: r2(agg.totals.netAssets),
          aum_from_banks: r2(agg.totals.aumFromBanks),
        },
        breakdown: agg.totals.breakdown,
        trend
      }
    });
  } catch (e) {
    console.error("[overview] error:", e);
    return NextResponse.json({ status: "error", message: "failed to load overview" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const client_id = intOrUndef(sp.get("client_id"));
  const year = intOrUndef(sp.get("year"));
  const month = intOrUndef(sp.get("month"));
  const month_date = sp.get("month_date") || undefined;
  return POST(
    new NextRequest(req.url, {
      method: "POST",
      body: JSON.stringify({ client_id, year, month, month_date }),
      headers: { "content-type": "application/json" },
    })
  );
}
