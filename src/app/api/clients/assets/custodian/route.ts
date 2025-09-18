// curl -s 'http://localhost:3001/api/clients/assets/custodian?client_id=44&year=2025&month=7' 

// All banks, latest-per-bank snapshot (any time)
// curl -s 'http://localhost:3001/api/clients/assets/custodian?client_id=29'

// Up to a date, all banks
// curl -s 'http://localhost:3001/api/clients/assets/custodian?client_id=29&to=2025-04-30'

// Custodian-only (latest for that custodian)
// curl -s 'http://localhost:3001/api/clients/assets/custodian?client_id=29&custodian=UOB'

// Custodian + up-to-date
// curl -s 'http://localhost:3001/api/clients/assets/custodian?client_id=29&custodian=Standard%20Chartered&to=2025-04-30'

// Account-only (latest for that account)
// curl -s 'http://localhost:3001/api/clients/assets/custodian?client_id=29&account=550051-1'

// Account + range
// curl -s 'http://localhost:3001/api/clients/assets/custodian?client_id=29&account=550051-1&from=2025-04-01&to=2025-04-30'

import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/lib/db";
import { intOrUndef, r2, rowsOf, palette } from "@/lib/format";

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

// helpers
const toLc = (s: string | null | undefined) => (s ?? "").toLowerCase();
const monthKey = (d?: string | null) => (d ? String(d).slice(0, 7) : "");

function latestPerBank(rows: BankBlock[]) {
  const m = new Map<string, BankBlock>();
  for (const r of rows) {
    const bank = (r.bank ?? "—").toString();
    if (!m.has(bank) || String(r.as_of_date) > String(m.get(bank)!.as_of_date)) {
      m.set(bank, r);
    }
  }
  return Array.from(m.values());
}
function latestSnapshot(rows: BankBlock[]) {
  if (!rows.length) return [];
  let max = rows[0].as_of_date ?? "";
  for (const r of rows) if (String(r.as_of_date) > String(max)) max = String(r.as_of_date);
  return rows.filter((r) => String(r.as_of_date) === String(max));
}

export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams;
    const clientId = intOrUndef(sp.get("client_id"));
    if (!clientId) return NextResponse.json({ status: "error", message: "client_id is required" }, { status: 400 });

    const custodian = sp.get("custodian");
    const accountParam = sp.get("account");
    const account = accountParam && accountParam !== "ALL" && accountParam.trim().length ? accountParam.trim() : null;

    const fromISO = sp.get("from") ?? sp.get("date_from");
    const toISO   = sp.get("to")   ?? sp.get("date_to");

    // 1) Get rows for range or full
    let rows: BankBlock[] = [];
    if (fromISO || toISO) {
      const fromEff = fromISO ?? "1900-01-01";
      const toEff   = toISO   ?? "9999-12-31";
      const data = await fetchRangeTableData(clientId, fromEff, toEff, custodian, account);
      rows = Array.isArray(data?.tableData) ? data.tableData : [];
    } else {
      // No dates: pull everything, then snapshot
      const data = await fetchRangeTableData(clientId, "1900-01-01", "9999-12-31", custodian, account);
      const allRows: BankBlock[] = Array.isArray(data?.tableData) ? data.tableData : [];
      if (!custodian && !account)       rows = latestPerBank(allRows);
      else if (custodian && !account)   rows = latestSnapshot(allRows.filter((r) => toLc(r.bank) === toLc(custodian)));
      else if (account && !custodian)   rows = latestSnapshot(allRows.filter((r) => (r.account_number ?? "") === account));
      else                              rows = latestSnapshot(allRows.filter((r) => toLc(r.bank) === toLc(custodian) && (r.account_number ?? "") === account));
    }

    // 2) Build splits (bank totals = net; currency & accounts = sum of row balances)
    const ccyTotals = new Map<string, number>();
    const bankTotals = new Map<string, number>();
    const matrix = new Map<string, Map<string, number>>();
    const acctTotals = new Map<string, number>();
    const acctCurMap = new Map<string, Map<string, number>>();

    const sumBlock = (b: any) => {
      const BUCKETS = [
        "cash_equivalents","direct_fixed_income","fixed_income_funds","direct_equities",
        "equities_fund","alternative_fund","structured_product","loans"
      ];
      // net (loans can be negative: keep sign)
      let net = 0;
      for (const key of BUCKETS) {
        const rows = rowsOf(b[key]);
        for (const r of rows) net += Number(r?.balanceUsd ?? r?.balance_usd ?? r?.balance ?? 0) || 0;
      }
      return net;
    };

    for (const b of rows) {
      const bank = (b.bank ?? "—").toString();
      const acct = (b.account_number ?? "—").toString();
      const acctKey = `${bank}|${acct}`;

      // bank net
      bankTotals.set(bank, (bankTotals.get(bank) || 0) + sumBlock(b));

      // currency/account splits
      for (const key of ["cash_equivalents","direct_fixed_income","fixed_income_funds","direct_equities",
                         "equities_fund","alternative_fund","structured_product","loans"]) {
        for (const r of rowsOf((b as any)[key])) {
          const usd = Number(r?.balanceUsd ?? r?.balance_usd ?? r?.balance ?? 0) || 0;
          if (!usd) continue;
          const ccy = (r?.currency ?? r?.ccy ?? "USD").toString();

          ccyTotals.set(ccy, (ccyTotals.get(ccy) || 0) + usd);

          if (!matrix.has(bank)) matrix.set(bank, new Map());
          matrix.get(bank)!.set(ccy, (matrix.get(bank)!.get(ccy) || 0) + usd);

          acctTotals.set(acctKey, (acctTotals.get(acctKey) || 0) + usd);

          if (!acctCurMap.has(acctKey)) acctCurMap.set(acctKey, new Map());
          const amap = acctCurMap.get(acctKey)!;
          amap.set(ccy, (amap.get(ccy) || 0) + usd);
        }
      }
    }

    // 3) Shape response (compatible with your Custodian page)
    const bankLabels = Array.from(bankTotals.keys());
    const bankData   = bankLabels.map((k) => r2(bankTotals.get(k) || 0));

    const ccyLabels = Array.from(ccyTotals.keys());
    const ccyData   = ccyLabels.map((k) => r2(ccyTotals.get(k) || 0));

    const banks = bankLabels;
    const currencies = ccyLabels;
    const matrix2D = banks.map((bk) => {
      const row = matrix.get(bk) || new Map();
      return currencies.map((ccy) => r2(row.get(ccy) || 0));
    });

    const byAccount = Array.from(acctTotals.entries())
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
      month_date: null, // not used for range mode
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
        by_account: byAccount,
        by_account_currency: byAccountCurrency,
        bank_currency: { banks, currencies, matrix: matrix2D },
      },
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    console.error("[custodian route] error:", e);
    return NextResponse.json({ status: "error", message: "failed to load" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({} as any));
  const qp = new URLSearchParams();
  if (body.client_id  != null) qp.set("client_id",  String(body.client_id));
  if (body.custodian  != null) qp.set("custodian",  String(body.custodian));
  if (body.account    != null) qp.set("account",    String(body.account));
  if (body.from       != null) qp.set("from",       String(body.from));
  if (body.to         != null) qp.set("to",         String(body.to));
  const url = req.nextUrl.origin + "/api/clients/assets/custodian?" + qp.toString();
  return GET(new NextRequest(url));
}
