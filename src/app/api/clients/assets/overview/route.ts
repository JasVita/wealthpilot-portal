// Latest snapshot (legacy month mode)
// curl -s 'http://localhost:3001/api/clients/assets/overview?client_id=29'

// Explicit month (May 2025)
// curl -s 'http://localhost:3001/api/clients/assets/overview?client_id=29&year=2025&month=5'

// “To only” → everything up to and including 2025-04-30 (all custodians)
// curl -s 'http://localhost:3001/api/clients/assets/overview?client_id=29&to=2025-04-30'

// Range → 2025-04-01 .. 2025-05-31 (all custodians)
// curl -s 'http://localhost:3001/api/clients/assets/overview?client_id=29&from=2025-04-01&to=2025-05-31'

// Custodian (case-insensitive) + “to only” → UOB up to 2025-04-30
// curl -s 'http://localhost:3001/api/clients/assets/overview?client_id=29&custodian=uob&to=2025-04-30'

// Custodian + “to only” → Standard Chartered up to 2025-04-30
// curl -s 'http://localhost:3001/api/clients/assets/overview?client_id=29&custodian=Standard%20Chartered&to=2025-04-30'

// Custodian + “to only” → Bank of Singapore up to 2025-05-31
// curl -s 'http://localhost:3001/api/clients/assets/overview?client_id=29&custodian=Bank%20of%20Singapore&to=2025-05-31'

// Account (auto-resolves bank) + “to only” → UOB acct 88-10101-18 up to 2025-04-30
// curl -s 'http://localhost:3001/api/clients/assets/overview?client_id=29&account=88-10101-18&to=2025-04-30'

// Account (auto-resolves bank) + “to only” → Standard Chartered acct 550051-1 up to 2025-04-30
// curl -s 'http://localhost:3001/api/clients/assets/overview?client_id=29&account=550051-1&to=2025-04-30'

// Account (auto-resolves bank) + “to only” → Bank of Singapore acct 10-1001-001715148 up to 2025-05-31
// curl -s 'http://localhost:3001/api/clients/assets/overview?client_id=29&account=10-1001-001715148&to=2025-05-31'

// Custodian + Account + “to only” (redundant but explicit) → UOB acct 88-10101-18 up to 2025-04-30
// curl -s 'http://localhost:3001/api/clients/assets/overview?client_id=29&custodian=UOB&account=88-10101-18&to=2025-04-30'

// “From only” → everything from 2025-03-01 onward (server fills to=9999-12-31)
// curl -s 'http://localhost:3001/api/clients/assets/overview?client_id=29&from=2025-03-01'

// Full range with Other custodian (example)
// curl -s 'http://localhost:3001/api/clients/assets/overview?client_id=29&custodian=Other&from=2025-03-01&to=2025-05-31'

// Example with a different client (44) and explicit month (kept from your original format)
// curl -s 'http://localhost:3001/api/clients/assets/overview?client_id=44&year=2025&month=7'
import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/lib/db";
import { intOrUndef, r2, rowsOf, sumCategory, palette } from "@/lib/format";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type BankBlock = Record<string, any> & {
  bank?: string | null;
  account_number?: string | null;
  as_of_date?: string | null;
};

const poolPromise = Promise.resolve().then(() => getPool());

async function getRecentMonths(clientId: number, limit = 12): Promise<Array<{ y: number; m: number }>> {
  const pool = await poolPromise;
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
  const pool = await poolPromise;
  const q = await pool.query<{ data: any }>(
    "select public.get_month_overview_aggregated($1,$2,$3)::jsonb as data",
    [clientId, y, m]
  );
  return q.rows?.[0]?.data ?? { tableData: [] };
}

async function fetchRangeTableData(
  clientId: number,
  fromISO: string,
  toISO: string,
  custodian: string | null,
  account: string | null
) {
  const pool = await poolPromise;
  const q = await pool.query<{ data: any }>(
    `select public.get_overview_range_aggregated($1,$2,$3,$4,$5)::jsonb as data`,
    [clientId, fromISO, toISO, custodian, account]
  );
  return q.rows?.[0]?.data ?? { tableData: [], periods: [], custodians: [] };
}

function paletteLocal(n: number) { return palette(n); }

function buildAggregates(tableData: BankBlock[]) {
  const bankTotals = new Map<string, number>();
  tableData.forEach((b) => {
    const total =
      sumCategory((b as any).loans) +
      sumCategory((b as any).equity_funds ?? (b as any).equities_fund) +
      sumCategory((b as any).direct_equities) +
      sumCategory((b as any).alternative_funds ?? (b as any).alternative_fund) +
      sumCategory((b as any).fixed_income_funds) +
      sumCategory((b as any).direct_fixed_income) +
      sumCategory((b as any).structured_products) +
      sumCategory((b as any).structured_product) +
      sumCategory((b as any).cash_and_equivalents) +
      sumCategory((b as any).cash_equivalents);

    const bank = (b.bank ?? "—").toString();
    bankTotals.set(bank, (bankTotals.get(bank) || 0) + total);
  });
  const bankLabels = Array.from(bankTotals.keys());
  const bankData = bankLabels.map((k) => bankTotals.get(k) || 0);

  const buckets: Array<[string, string[]]> = [
    ["Cash And Equivalents", ["cash_and_equivalents", "cash_equivalents"]],
    ["Direct Fixed Income", ["direct_fixed_income"]],
    ["Fixed Income Funds", ["fixed_income_funds"]],
    ["Direct Equities", ["direct_equities"]],
    ["Equities Fund", ["equities_fund", "equity_funds"]],
    ["Alternative Fund", ["alternative_fund", "alternative_funds"]],
    ["Structured Product", ["structured_products", "structured_product"]],
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
      "cash_equivalents","cash_and_equivalents","direct_fixed_income","fixed_income_funds","direct_equities",
      "equities_fund","equity_funds","alternative_fund","alternative_funds","structured_product","structured_products","loans",
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

  const grossAssets = assetLabels.filter((l) => l !== "Loans").reduce((a, l) => a + (assetTotals.get(l) || 0), 0);
  const loans = assetTotals.get("Loans") || 0;
  const netAssets = grossAssets + loans;
  const aumFromBanks = bankData.reduce((a, b) => a + b, 0);

  const breakdown: Record<string, number> = {};
  for (const l of assetLabels) breakdown[l] = r2(assetTotals.get(l) || 0);

  return {
    charts: [
      { title: "AUM_ratio", labels: bankLabels, data: bankData, colors: paletteLocal(bankLabels.length) },
      { title: "overall_asset_class_breakdown", labels: assetLabels, data: assetData, colors: paletteLocal(assetLabels.length) },
      { title: "overall_currency_breakdown", labels: ccyLabels, data: ccyData, colors: paletteLocal(ccyLabels.length) },
    ],
    totals: { grossAssets, loans, netAssets, aumFromBanks, breakdown },
  };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({} as any));
    const clientId = intOrUndef(body?.client_id);
    const year = intOrUndef(body?.year);
    const month = intOrUndef(body?.month);
    const monthDate: string | undefined = body?.month_date;

    // optional filters
    const custodian: string | null = (body?.custodian ?? null) || null;
    const account: string | null =
      (typeof body?.account === "string" && body.account.trim() && body.account !== "ALL") ? body.account.trim() : null;

    // “to-only” and “from-only” support
    const fromISO: string | null = body?.from ?? body?.date_from ?? null;
    const toISO: string | null   = body?.to   ?? body?.date_to   ?? null;

    if (!clientId) {
      return NextResponse.json({ status: "error", message: "client_id is required" }, { status: 400 });
    }

    // RANGE MODE when any bound is provided
    if (fromISO || toISO) {
      const fromEff = fromISO ?? "1900-01-01";
      const toEff   = toISO   ?? "9999-12-31";
      const data = await fetchRangeTableData(clientId, fromEff, toEff, custodian, account);
      const tableDataArr: BankBlock[] = Array.isArray(data?.tableData) ? data.tableData : [];
      const agg = buildAggregates(tableDataArr);

      // Trend: build months between bounds
      const start = new Date(fromEff + "T00:00:00Z");
      const end   = new Date(toEff   + "T00:00:00Z");
      const months: { y: number; m: number }[] = [];
      const d = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1));
      while (d <= end) {
        months.push({ y: d.getUTCFullYear(), m: d.getUTCMonth() + 1 });
        d.setUTCMonth(d.getUTCMonth() + 1);
      }
      const trend = [];
      for (const cand of months) {
        const td = await fetchMonthTableData(clientId, cand.y, cand.m);
        let arr: BankBlock[] = Array.isArray(td?.tableData) ? td.tableData : [];
        if (custodian) {
          const ci = custodian.toLowerCase();
          arr = arr.filter((b) => (b.bank ?? "").toString().toLowerCase() === ci);
        }
        if (account) {
          arr = arr.filter((b) => (b.account_number ?? "") === account);
        }
        const t = buildAggregates(arr);
        const label = new Date(Date.UTC(cand.y, cand.m - 1, 1)).toLocaleDateString("en-US", { month: "short", year: "numeric" });
        trend.push({ y: cand.y, m: cand.m, label, net_assets: r2(t.totals.netAssets) });
      }

      return NextResponse.json({
        status: "ok",
        overview_data: [
          { month_date: toEff, pie_chart_data: { charts: agg.charts }, table_data: { tableData: tableDataArr } }
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
    }

    // LEGACY SINGLE-MONTH MODE
    let y = year, m = month;
    if (monthDate && (!y || !m)) {
      const d = new Date(monthDate);
      if (!isNaN(+d)) { y = d.getUTCFullYear(); m = d.getUTCMonth() + 1; }
    }

    const months = (!y || !m) ? await getRecentMonths(clientId, 12) : [{ y: y!, m: m! }];
    if (!months.length) return NextResponse.json({ status: "ok", overview_data: [], computed: null });

    let sel = months[0];
    let tableData: any = null;
    for (const cand of months) {
      const td = await fetchMonthTableData(clientId, cand.y, cand.m);
      const arr = Array.isArray(td?.tableData) ? td.tableData : [];
      if (arr.length > 0) { sel = cand; tableData = td; break; }
    }
    if (!tableData) tableData = await fetchMonthTableData(clientId, sel.y, sel.m);

    // filter by custodian/account if provided
    let tableDataArr: BankBlock[] = Array.isArray(tableData?.tableData) ? tableData.tableData : [];
    if (custodian) {
      const ci = custodian.toLowerCase();
      tableDataArr = tableDataArr.filter((b) => (b.bank ?? "").toString().toLowerCase() === ci);
    }
    if (account) {
      tableDataArr = tableDataArr.filter((b) => (b.account_number ?? "") === account);
    }

    const agg = buildAggregates(tableDataArr);

    const trend = [];
    for (const cand of months) {
      const td = await fetchMonthTableData(clientId, cand.y, cand.m);
      let arr: BankBlock[] = Array.isArray(td?.tableData) ? td.tableData : [];
      if (custodian) {
        const ci = custodian.toLowerCase();
        arr = arr.filter((b) => (b.bank ?? "").toString().toLowerCase() === ci);
      }
      if (account) {
        arr = arr.filter((b) => (b.account_number ?? "") === account);
      }
      const t = buildAggregates(arr);
      const label = new Date(Date.UTC(cand.y, cand.m - 1, 1)).toLocaleDateString("en-US", { month: "short", year: "numeric" });
      trend.push({ y: cand.y, m: cand.m, label, net_assets: r2(t.totals.netAssets) });
    }

    const month_date = new Date(Date.UTC(sel.y, sel.m - 1, 1)).toUTCString();
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

  const custodian = sp.get("custodian");
  const accountParam = sp.get("account");
  const account =
    accountParam && accountParam !== "ALL" && accountParam.trim().length ? accountParam.trim() : null;

  const from = sp.get("from") ?? sp.get("date_from");
  const to   = sp.get("to")   ?? sp.get("date_to");

  const body: any = { client_id, year, month, month_date, custodian, account };
  if (from) body.from = from;
  if (to) body.to = to;

  return POST(
    new NextRequest(req.url, {
      method: "POST",
      body: JSON.stringify(body),
      headers: { "content-type": "application/json" },
    })
  );
}