// src/app/api/clients/assets/overview/route.ts
// Usage samples:
//
// Latest snapshot (ALL → latest per custodian)
//   curl -s 'http://localhost:3001/api/clients/assets/overview?client_id=29'
//
// Custodian-only latest (no dates)
//   curl -s 'http://localhost:3001/api/clients/assets/overview?client_id=29&custodian=Standard%20Chartered'
//
// Account-only latest (no dates)
//   curl -s 'http://localhost:3001/api/clients/assets/overview?client_id=29&account=550051-1'
//
// “To only” (up to date) across all custodians
//   curl -s 'http://localhost:3001/api/clients/assets/overview?client_id=29&to=2025-04-30'
//
// Range (from..to) across all custodians
//   curl -s 'http://localhost:3001/api/clients/assets/overview?client_id=29&from=2025-04-01&to=2025-05-31'
//
// Custodian + “to only”
//   curl -s 'http://localhost:3001/api/clients/assets/overview?client_id=29&custodian=Bank%20of%20Singapore&to=2025-05-31'
//
// Range + Account
//   curl -s 'http://localhost:3001/api/clients/assets/overview?client_id=29&account=550051-1&from=2025-04-01&to=2025-04-30'

import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/lib/db";
import { intOrUndef, r2, rowsOf, sumCategory, palette } from "@/lib/format";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type BankBlock = Record<string, any> & {
  bank?: string | null;
  account_number?: string | null;
  as_of_date?: string | null; // 'YYYY-MM-DD'
};

const poolPromise = Promise.resolve().then(() => getPool());

async function fetchRangeTableData(
  clientId: number,
  fromISO: string | null,
  toISO: string | null,
  custodian: string | null,
  account: string | null
) {
  const pool = await poolPromise;
  const q = await pool.query<{ data: any }>(
    // use your _test function while validating
    `select public.get_overview_range_aggregated_test($1,$2,$3,$4,$5)::jsonb as data`,
    [clientId, fromISO, toISO, custodian, account]
  );
  return q.rows?.[0]?.data ?? { tableData: [], periods: [], custodians: [] };
}


function paletteLocal(n: number) {
  return palette(n);
}

/** Aggregate builder used for charts & KPIs. */
function buildAggregates(tableData: BankBlock[]) {
  // AUM by bank
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

  // Bucket totals
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

  // Currency split
  const ccyTotals = new Map<string, number>();
  tableData.forEach((b) => {
    for (const k of [
      "cash_equivalents",
      "cash_and_equivalents",
      "direct_fixed_income",
      "fixed_income_funds",
      "direct_equities",
      "equities_fund",
      "equity_funds",
      "alternative_fund",
      "alternative_funds",
      "structured_product",
      "structured_products",
      "loans",
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

  // Cards
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

/** YYYY-MM key from 'YYYY-MM-DD'. */
function monthKey(d: string | null | undefined) {
  if (!d) return "";
  return String(d).slice(0, 7);
}

/** Latest-per-bank snapshot (used for ALL). */
function latestPerBank(rows: BankBlock[]): BankBlock[] {
  const map = new Map<string, BankBlock>();
  for (const r of rows) {
    const bank = (r.bank ?? "—").toString();
    const prev = map.get(bank);
    if (!prev || String(r.as_of_date) > String(prev.as_of_date)) {
      map.set(bank, r);
    }
  }
  return Array.from(map.values());
}

/** Latest snapshot by max(as_of_date) among the set. */
function latestSnapshot(rows: BankBlock[]): BankBlock[] {
  if (!rows.length) return [];
  let max = rows[0].as_of_date ?? "";
  for (const r of rows) {
    if (String(r.as_of_date) > String(max)) max = String(r.as_of_date);
  }
  return rows.filter((r) => String(r.as_of_date) === String(max));
}

/** Build trend series (month → net assets) from the provided row set. */
function buildTrendFromRows(allRows: BankBlock[]) {
  const byMonth = new Map<string, BankBlock[]>();
  for (const r of allRows) {
    const mk = monthKey(r.as_of_date);
    if (!mk) continue;
    if (!byMonth.has(mk)) byMonth.set(mk, []);
    byMonth.get(mk)!.push(r);
  }
  const months = Array.from(byMonth.keys()).sort(); // asc
  const trend = months.map((mk) => {
    const agg = buildAggregates(byMonth.get(mk)!);
    const [yS, mS] = mk.split("-");
    const y = Number(yS), m = Number(mS);
    const label = new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString("en-US", { month: "short", year: "numeric" });
    return { y, m, label, net_assets: r2(agg.totals.netAssets) };
  });
  return trend;
}

/** Safe lowercase helper for TS refinement. */
function toLc(s: string | null | undefined) {
  return (s ?? "").toLowerCase();
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({} as any));
    const clientId = intOrUndef(body?.client_id);
    if (!clientId) {
      return NextResponse.json({ status: "error", message: "client_id is required" }, { status: 400 });
    }

    const year = intOrUndef(body?.year);
    const month = intOrUndef(body?.month);
    const monthDate: string | undefined = body?.month_date;

    const custodian: string | null = (body?.custodian ?? null) || null;
    const account: string | null =
      (typeof body?.account === "string" && body.account.trim() && body.account !== "ALL") ? body.account.trim() : null;

    // independent bounds (to-only or from-only both allowed)
    const fromISO: string | null = body?.from ?? body?.date_from ?? null;
    const toISO: string | null = body?.to ?? body?.date_to ?? null;

    // ---------- RANGE MODE (any bound provided) ----------
    if (fromISO || toISO) {
      const fromEff = fromISO ?? null;
      const toEff = toISO ?? null;
      const data = await fetchRangeTableData(clientId, fromEff, toEff, custodian, account);
      const rows: BankBlock[] = Array.isArray(data?.tableData) ? data.tableData : [];

      const agg = buildAggregates(rows);
      const trend = buildTrendFromRows(rows);

      return NextResponse.json({
        status: "ok",
        overview_data: [
          { month_date: toEff, pie_chart_data: { charts: agg.charts }, table_data: { tableData: rows } }
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

    // ---------- NO DATES: build snapshot(s) from full range in ONE call ----------
    const data = await fetchRangeTableData(clientId, "1900-01-01", "9999-12-31", custodian, account);
    const allRows: BankBlock[] = Array.isArray(data?.tableData) ? data.tableData : [];

    let snapshot: BankBlock[] = [];
    if (!custodian && !account) {
      // ALL → latest per custodian
      snapshot = latestPerBank(allRows);
    } else if (custodian && !account) {
      // custodian only → latest for that custodian
      const lc = toLc(custodian);
      snapshot = latestSnapshot(allRows.filter((r) => toLc(r.bank) === lc));
    } else if (account && !custodian) {
      // account only → latest for that account
      snapshot = latestSnapshot(allRows.filter((r) => (r.account_number ?? "") === account));
    } else {
      // both provided → latest with both filters
      const lc = toLc(custodian);
      snapshot = latestSnapshot(
        allRows.filter(
          (r) => toLc(r.bank) === lc && (r.account_number ?? "") === account
        )
      );
    }

    const agg = buildAggregates(snapshot);
    const trend = buildTrendFromRows(
      (!custodian && !account) ? allRows
        : (custodian && !account) ? allRows.filter((r) => toLc(r.bank) === toLc(custodian))
          : (account && !custodian) ? allRows.filter((r) => (r.account_number ?? "") === account)
            : allRows.filter((r) => toLc(r.bank) === toLc(custodian) && (r.account_number ?? "") === account)
    );

    return NextResponse.json({
      status: "ok",
      overview_data: [
        { month_date: new Date().toUTCString(), pie_chart_data: { charts: agg.charts }, table_data: { tableData: snapshot } }
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
  const to = sp.get("to") ?? sp.get("date_to");

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
