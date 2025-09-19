// src/app/api/clients/assets/cash/route.ts
// Examples:
//   Cash (ALL latest)                   → curl -s 'http://localhost:3001/api/clients/assets/cash?client_id=29&scope=cash'
//   Cash for UOB up to Apr 30           → curl -s 'http://localhost:3001/api/clients/assets/cash?client_id=29&scope=cash&custodian=UOB&to=2025-04-30'
//   Cash for account + range            → curl -s 'http://localhost:3001/api/clients/assets/cash?client_id=29&scope=cash&account=10-1001-001715148&from=2025-03-01&to=2025-05-31'

import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/lib/db";
import { intOrUndef, r2, rowsOf, palette } from "@/lib/format";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type BankBlock = {
  bank?: string | null;
  account_number?: string | null;
  as_of_date?: string | null;
} & Record<string, any>;

async function getRecentMonths(clientId: number, limit = 24) {
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

async function fetchRangeTableData(
  clientId: number,
  fromISO: string | null,
  toISO: string | null,
  custodian: string | null,
  account: string | null
) {
  const pool = getPool();
  const q = await pool.query<{ data: any }>(
    `select public.get_overview_range_aggregated_test($1,$2,$3,$4,$5)::jsonb as data`,
    [clientId, fromISO, toISO, custodian, account]
  );
  return q.rows?.[0]?.data ?? { tableData: [], periods: [], custodians: [] };
}

export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams;
    const clientId = intOrUndef(sp.get("client_id"));
    let year = intOrUndef(sp.get("year"));
    let month = intOrUndef(sp.get("month"));
    const month_date = sp.get("month_date") || undefined;

    const scope = (sp.get("scope") || "cash").toLowerCase();
    const KEYS =
      scope === "cash"
        ? (["cash_equivalents"] as const)
        : ([
          "cash_equivalents",
          "direct_fixed_income",
          "fixed_income_funds",
          "direct_equities",
          "equities_fund",
          "alternative_fund",
          "structured_product",
          "loans",
        ] as const);

    const custodian = sp.get("custodian");
    const account = sp.get("account");
    const fromISO = sp.get("from") ?? sp.get("date_from");
    const toISO = sp.get("to") ?? sp.get("date_to");

    if (!clientId) {
      return NextResponse.json({ status: "error", message: "client_id is required" }, { status: 400 });
    }

    // RANGE/FILTER PATH
    if (fromISO || toISO || custodian || account) {
      const fromEff = fromISO ?? null;
      const toEff = toISO ?? null;
      const data = await fetchRangeTableData(clientId, fromEff, toEff, custodian, account);
      const labelDate = toISO ?? fromISO ?? null;
      const blocks: BankBlock[] = Array.isArray(data?.tableData) ? data.tableData : [];

      // Aggregation (cash-only when scope=cash)
      const ccyTotals = new Map<string, number>();
      const bankTotals = new Map<string, number>();
      const matrix = new Map<string, Map<string, number>>();
      const accountTotals = new Map<string, number>();
      const acctCurMap = new Map<string, Map<string, number>>();

      const sumCat = (cat: any) => rowsOf(cat).reduce((a, r) => a + (Number(r?.balance_usd ?? r?.balance ?? 0) || 0), 0);

      for (const b of blocks) {
        const bank = (b.bank ?? "—").toString();
        const acct = (b.account_number ?? "—").toString();
        const acctKey = `${bank}|${acct}`;

        let bankSum = 0;
        for (const key of KEYS) bankSum += sumCat((b as any)[key]);
        bankTotals.set(bank, (bankTotals.get(bank) || 0) + bankSum);

        for (const key of KEYS) {
          for (const r of rowsOf((b as any)[key])) {
            const usd = Number(r?.balance_usd ?? r?.balance ?? 0) || 0;
            if (!usd) continue;
            const ccy = (r?.currency ?? "USD").toString();

            ccyTotals.set(ccy, (ccyTotals.get(ccy) || 0) + usd);
            if (!matrix.has(bank)) matrix.set(bank, new Map());
            matrix.get(bank)!.set(ccy, (matrix.get(bank)!.get(ccy) || 0) + usd);

            if (acct !== "—") {
              accountTotals.set(acctKey, (accountTotals.get(acctKey) || 0) + usd);
              if (!acctCurMap.has(acctKey)) acctCurMap.set(acctKey, new Map());
              const amap = acctCurMap.get(acctKey)!;
              amap.set(ccy, (amap.get(ccy) || 0) + usd);
            }
          }
        }
      }

      const bankLabels = Array.from(bankTotals.keys());
      const bankData = bankLabels.map((k) => r2(bankTotals.get(k) || 0));

      const ccyLabels = Array.from(ccyTotals.keys());
      const ccyData = ccyLabels.map((k) => r2(ccyTotals.get(k) || 0));

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
        .filter((a) => a.account !== "—")
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
         month_date: labelDate,
        totals: { grand_total: grand },
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
          by_account: byAccount,                       // ✅ fixed
          by_account_currency: byAccountCurrency,      // ✅ fixed
          bank_currency: { banks, currencies, matrix: matrix2D },
        },
      });
    }

    // NO FILTERS → latest non-empty month
    if (month_date && (!year || !month)) {
      const d = new Date(month_date);
      if (!isNaN(+d)) {
        year = d.getUTCFullYear();
        month = d.getUTCMonth() + 1;
      }
    }

    const months = !year || !month ? await getRecentMonths(clientId, 12) : [{ y: year!, m: month! }];
    if (!months.length) {
      return NextResponse.json({
        status: "ok",
        month_date: null,
        totals: { grand_total: 0 },
        cash: {
          by_currency: { labels: [], data: [], colors: [], pairs: [] },
          by_bank: { labels: [], data: [], colors: [], pairs: [] },
          by_account: [],
          by_account_currency: [],
          bank_currency: { banks: [], currencies: [], matrix: [] },
        },
      });
    }

    let sel = months[0];
    let monthly = await fetchMonthTableData(clientId, sel.y, sel.m);
    if (!Array.isArray(monthly?.tableData) || monthly.tableData.length === 0) {
      for (const cand of months) {
        const td = await fetchMonthTableData(clientId, cand.y, cand.m);
        if (Array.isArray(td?.tableData) && td.tableData.length) {
          sel = cand;
          monthly = td;
          break;
        }
      }
    }

    const blocks: BankBlock[] = Array.isArray(monthly?.tableData) ? monthly.tableData : [];

    const ccyTotals = new Map<string, number>();
    const bankTotals = new Map<string, number>();
    const matrix = new Map<string, Map<string, number>>();
    const accountTotals = new Map<string, number>();
    const acctCurMap = new Map<string, Map<string, number>>();

    const sumCat = (cat: any) => rowsOf(cat).reduce((a, r) => a + (Number(r?.balance_usd ?? r?.balance ?? 0) || 0), 0);

    for (const b of blocks) {
      const bank = (b.bank ?? "—").toString();
      const acct = (b.account_number ?? "—").toString();
      const acctKey = `${bank}|${acct}`;

      let bankSum = 0;
      for (const key of KEYS) bankSum += sumCat((b as any)[key]);
      bankTotals.set(bank, (bankTotals.get(bank) || 0) + bankSum);

      for (const key of KEYS) {
        for (const r of rowsOf((b as any)[key])) {
          const usd = Number(r?.balance_usd ?? r?.balance ?? 0) || 0;
          if (!usd) continue;
          const ccy = (r?.currency ?? "USD").toString();

          ccyTotals.set(ccy, (ccyTotals.get(ccy) || 0) + usd);
          if (!matrix.has(bank)) matrix.set(bank, new Map());
          matrix.get(bank)!.set(ccy, (matrix.get(bank)!.get(ccy) || 0) + usd);

          if (acct !== "—") {
            accountTotals.set(acctKey, (accountTotals.get(acctKey) || 0) + usd);
            if (!acctCurMap.has(acctKey)) acctCurMap.set(acctKey, new Map());
            const amap = acctCurMap.get(acctKey)!;
            amap.set(ccy, (amap.get(ccy) || 0) + usd);
          }
        }
      }
    }

    const bankLabels = Array.from(bankTotals.keys());
    const bankData = bankLabels.map((k) => r2(bankTotals.get(k) || 0));

    const ccyLabels = Array.from(ccyTotals.keys());
    const ccyData = ccyLabels.map((k) => r2(ccyTotals.get(k) || 0));

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
      .filter((a) => a.account !== "—")
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
      month_date: new Date(Date.UTC(sel.y, sel.m - 1, 1)).toUTCString(),
      totals: { grand_total: grand },
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
        by_account: byAccount,                       // ✅ fixed
        by_account_currency: byAccountCurrency,      // ✅ fixed
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
  if (body.scope != null) qp.set("scope", String(body.scope));
  if (body.custodian != null) qp.set("custodian", String(body.custodian));
  if (body.account != null) qp.set("account", String(body.account));
  if (body.from != null) qp.set("from", String(body.from));
  if (body.to != null) qp.set("to", String(body.to));
  const url = req.nextUrl.origin + "/api/clients/assets/cash?" + qp.toString();
  return GET(new NextRequest(url));
}
