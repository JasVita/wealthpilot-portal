// curl -s 'http://localhost:3001/api/clients/assets/cash?client_id=44&year=2025&month=7' 
import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* ---------------- helpers ---------------- */
function intOrUndef(v: any) {
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}
const r2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

function palette(n: number): string[] {
  const base = [
    "#4F6CF0", "#34d399", "#fbbf24", "#f472b6", "#38bdf8",
    "#a78bfa", "#ef4444", "#10b981", "#22d3ee", "#fb7185",
  ];
  const out: string[] = [];
  for (let i = 0; i < n; i++) out.push(base[i % base.length]);
  return out;
}

type BankBlock = {
  bank?: string | null;
  account_number?: string | null;
  as_of_date?: string | null;
} & Record<string, any>;

const rowsOf = (cat: any): any[] =>
  !cat ? [] : Array.isArray(cat) ? cat : Array.isArray(cat?.rows) ? cat.rows : [];

/* ---------------- months / overview payload ---------------- */
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

/* ---------------- route ---------------- */
export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams;
    const clientId = intOrUndef(sp.get("client_id"));
    let year  = intOrUndef(sp.get("year"));
    let month = intOrUndef(sp.get("month"));
    const month_date = sp.get("month_date") || undefined;

    if (!clientId) {
      return NextResponse.json({ status: "error", message: "client_id is required" }, { status: 400 });
    }

    if (month_date && (!year || !month)) {
      const d = new Date(month_date);
      if (!isNaN(+d)) { year = d.getUTCFullYear(); month = d.getUTCMonth() + 1; }
    }

    const months = (!year || !month) ? await getRecentMonths(clientId, 12) : [{ y: year!, m: month! }];
    if (!months.length) {
      return NextResponse.json({
        status: "ok",
        month_date: null,
        totals: { grand_total: 0 },
        cash: {
          by_currency: { labels: [], data: [], colors: [], pairs: [] },
          by_bank:     { labels: [], data: [], colors: [], pairs: [] },
          by_account: [],
          by_account_currency: [],
          bank_currency: { banks: [], currencies: [], matrix: [] },
        },
      });
    }

    // pick the first month that actually has tableData
    let sel = months[0];
    let monthly = await fetchMonthTableData(clientId, sel.y, sel.m);
    if (!Array.isArray(monthly?.tableData) || monthly.tableData.length === 0) {
      for (const cand of months) {
        const td = await fetchMonthTableData(clientId, cand.y, cand.m);
        if (Array.isArray(td?.tableData) && td.tableData.length) { sel = cand; monthly = td; break; }
      }
    }

    const monthDateStr = new Date(Date.UTC(sel.y, sel.m - 1, 1)).toUTCString();
    const blocks: BankBlock[] = Array.isArray(monthly?.tableData) ? monthly.tableData : [];

    // recompute everything from tableData (matches overview)
    const ccyTotals  = new Map<string, number>();                     // currency  -> amount
    const bankTotals = new Map<string, number>();                     // bank      -> net amount
    const matrix     = new Map<string, Map<string, number>>();        // bank -> (ccy -> amount)
    const accountTotals = new Map<string, number>();                  // "bank|acct" -> amount
    const acctCurMap   = new Map<string, Map<string, number>>();      // "bank|acct" -> (ccy -> amount)

    const sumCat = (cat: any) => {
      if (!cat) return 0;
      if (typeof cat?.subtotalUsd === "number") return Number(cat.subtotalUsd) || 0;
      const rows = rowsOf(cat);
      return rows.reduce((a, r) => a + (Number(r?.balanceUsd ?? r?.balance ?? 0) || 0), 0);
    };

    for (const b of blocks) {
      const bank = (b.bank ?? "—").toString();
      const acct = (b.account_number ?? "—").toString();
      const acctKey = `${bank}|${acct}`;

      // bank net (include loans — matches Net Assets / overview)
      const net =
        sumCat(b.loans) +
        sumCat(b.equity_funds ?? b.equities_fund) +
        sumCat(b.direct_equities) +
        sumCat(b.alternative_funds ?? b.alternative_fund) +
        sumCat(b.fixed_income_funds) +
        sumCat(b.direct_fixed_income) +
        sumCat(b.structured_products) +
        sumCat(b.cash_and_equivalents);

      bankTotals.set(bank, (bankTotals.get(bank) || 0) + net);

      // currency + account splits — iterate every bucket’s rows
      for (const key of [
        "cash_and_equivalents",
        "direct_fixed_income",
        "fixed_income_funds",
        "direct_equities",
        "equities_fund",
        "equity_funds",
        "alternative_fund",
        "alternative_funds",
        "structured_products",
        "loans",
      ]) {
        for (const r of rowsOf((b as any)[key])) {
          const usd = Number(r?.balanceUsd ?? r?.balance ?? 0) || 0;
          if (!usd) continue;
          const ccy = (r?.ccy ?? r?.currency ?? "USD").toString();

          ccyTotals.set(ccy, (ccyTotals.get(ccy) || 0) + usd);

          if (!matrix.has(bank)) matrix.set(bank, new Map());
          matrix.get(bank)!.set(ccy, (matrix.get(bank)!.get(ccy) || 0) + usd);

          accountTotals.set(acctKey, (accountTotals.get(acctKey) || 0) + usd);

          if (!acctCurMap.has(acctKey)) acctCurMap.set(acctKey, new Map());
          const amap = acctCurMap.get(acctKey)!;
          amap.set(ccy, (amap.get(ccy) || 0) + usd);
        }
      }
    }

    // shape response
    const bankLabels = Array.from(bankTotals.keys());
    const bankData   = bankLabels.map((k) => r2(bankTotals.get(k) || 0));
    const ccyLabels  = Array.from(ccyTotals.keys());
    const ccyData    = ccyLabels.map((k) => r2(ccyTotals.get(k) || 0));

    const banks = bankLabels;
    const currencies = ccyLabels;
    const matrix2D = banks.map((bk) => {
      const row = matrix.get(bk) || new Map();
      return currencies.map((ccy) => r2(row.get(ccy) || 0));
    });

    const byAccount = Array.from(accountTotals.entries())
      .map(([key, amount]) => {
        const [bank, account] = key.split("|");
        return { bank, account, amount: r2(amount) };
      })
      .filter(a => a.account !== "—")
      .sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount));

    const byAccountCurrency = Array.from(acctCurMap.entries()).map(([key, m]) => {
      const [bank, account] = key.split("|");
      const items = Array.from(m.entries())
        .map(([currency, amount]) => ({ currency, amount: r2(amount) }))
        .sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount));
      return { bank, account, items };
    });

    const grand = r2(ccyData.reduce((a, b) => a + b, 0));

    return NextResponse.json({
      status: "ok",
      month_date: monthDateStr,
      totals: { grand_total: grand }, // == Net Assets
      cash: {
        by_currency: {
          labels: ccyLabels,
          data: ccyData,
          colors: palette(ccyLabels.length),
          pairs: ccyLabels.map((currency, i) => ({ currency, amount: ccyData[i] })),
        },
        by_bank: {
          labels: bankLabels,
          data: bankData,
          colors: palette(bankLabels.length),
          pairs: bankLabels.map((bank, i) => ({ bank, amount: bankData[i] })),
        },
        by_account: byAccount,
        by_account_currency: byAccountCurrency,
        bank_currency: { banks, currencies, matrix: matrix2D },
      },
    });
  } catch (e) {
    console.error("[cash route] error:", e);
    return NextResponse.json({ status: "error", message: "failed to load" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({} as any));
  const qp = new URLSearchParams();
  if (body.client_id != null) qp.set("client_id", String(body.client_id));
  if (body.year != null) qp.set("year", String(body.year));
  if (body.month != null) qp.set("month", String(body.month));
  if (body.month_date != null) qp.set("month_date", String(body.month_date));
  const url = req.nextUrl.origin + "/api/clients/assets/cash?" + qp.toString();
  return GET(new NextRequest(url));
}
