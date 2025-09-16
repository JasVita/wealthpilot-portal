// curl -s 'http://localhost:3001/api/clients?user_id=10'
// Client List page or Existing clients:
import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/lib/db";
import { palette, rowsOf, r2, balanceVal } from "@/lib/format";  // ← use shared helpers

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type BankBlock = Record<string, any> & {
  bank?: string | null;
  account_number?: string | null;
  as_of_date?: string | null;
};

/* -------- build aggregates the same way your old route did -------- */
function buildAggregates(tableData: BankBlock[]) {
  // AUM by bank (net), by currency, by account, and bank×currency matrix
  const bankTotals = new Map<string, number>();
  const ccyTotals = new Map<string, number>();
  const byAccount = new Map<string, number>();
  const byAccountCurrency = new Map<string, Map<string, number>>();
  const bankCcy = new Map<string, Map<string, number>>();

  const add = (m: Map<string, number>, k: string, v: number) =>
    m.set(k, (m.get(k) ?? 0) + v);

  const BUCKET_KEYS = [
    "cash_equivalents",
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
  ];

  for (const b of tableData) {
    const bank = (b.bank ?? "—").toString();
    const acct = (b.account_number ?? "—").toString();
    const acctKey = `${bank}|${acct}`;
    let net = 0;

    for (const key of BUCKET_KEYS) {
      const rows = rowsOf((b as any)[key]);
      for (const r of rows) {
        const usd = balanceVal(r);
        if (!usd) continue;
        const ccy = (r?.currency ?? "USD").toString();
        net += usd;
        add(ccyTotals, ccy, usd);
        if (!bankCcy.has(bank)) bankCcy.set(bank, new Map());
        bankCcy.get(bank)!.set(ccy, (bankCcy.get(bank)!.get(ccy) ?? 0) + usd);
        add(byAccount, acctKey, usd);
        if (!byAccountCurrency.has(acctKey)) byAccountCurrency.set(acctKey, new Map());
        const amap = byAccountCurrency.get(acctKey)!;
        amap.set(ccy, (amap.get(ccy) ?? 0) + usd);
      }
    }
    add(bankTotals, bank, net);
  }

  const bankLabels = Array.from(bankTotals.keys());
  const bankData = bankLabels.map((k) => r2(bankTotals.get(k) || 0));

  const ccyPairs = Array.from(ccyTotals.entries()).sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]));
  const ccyLabels = ccyPairs.map(([k]) => k);
  const ccyData = ccyPairs.map(([, v]) => r2(v));

  const assetBuckets: Array<[string, string[]]> = [
    ["Cash And Equivalents", ["cash_equivalents"]],
    ["Direct Fixed Income", ["direct_fixed_income"]],
    ["Fixed Income Funds", ["fixed_income_funds"]],
    ["Direct Equities", ["direct_equities"]],
    ["Equities Fund", ["equities_fund", "equity_funds"]],
    ["Alternative Fund", ["alternative_fund", "alternative_funds"]],
    ["Structured Product", ["structured_product", "structured_products"]],
    ["Loans", ["loans"]],
  ];

  const assetTotals = new Map<string, number>();
  for (const [pretty, variants] of assetBuckets) {
    let sum = 0;
    for (const b of tableData) {
      for (const v of variants) {
        for (const r of rowsOf((b as any)[v])) sum += balanceVal(r);
      }
    }
    assetTotals.set(pretty, sum);
  }
  const assetLabels = assetBuckets.map(([pretty]) => pretty);
  const assetData = assetLabels.map((k) => r2(assetTotals.get(k) || 0));

  // summary: gross assets + loans (as negative) = net
  const gross = assetLabels
    .filter((x) => x !== "Loans")
    .reduce((a, l) => a + (assetTotals.get(l) || 0), 0);

  const loansRaw = assetTotals.get("Loans") || 0;
  const loansAbs = r2(Math.abs(loansRaw));
  const net = r2(gross + loansRaw);
  const assets = r2(gross);

  // build pie datasets with palette
  const charts = [
    {
      title: "AUM_ratio",
      labels: bankLabels,
      data: bankData,
      colors: palette(bankLabels.length),
    },
    {
      title: "overall_asset_class_breakdown",
      labels: assetLabels,
      data: assetData,
      colors: palette(assetLabels.length),
    },
    {
      title: "overall_currency_breakdown",
      labels: ccyLabels,
      data: ccyData,
      colors: palette(ccyLabels.length),
    },
  ];

  // summary
  const totalCustodians = bankLabels.filter((b) => b !== "—").length;
  return {
    charts,
    summary: {
      total_custodians: totalCustodians,
      total_assets_usd: assets,
      total_debts_usd: loansAbs,
      net_assets_usd: net,
    },
  };
}

/* -------- DB helpers -------- */

async function fetchClientsForUser(userId: number) {
  const pool = getPool();
  const q = await pool.query<{ id: number; name: string; code: string | null }>(
    `select id, name, code from public.client where user_id = $1 order by id desc`,
    [userId]
  );
  return q.rows ?? [];
}

// call your range function
async function overviewRange(
  clientId: number,
  fromISO: string,
  toISO: string,
  custodian: string | null
) {
  const pool = getPool();
  const { rows } = await pool.query<{ data: { tableData: BankBlock[]; periods?: string[]; custodians?: string[] } }>(
    `select public.get_overview_range_aggregated($1,$2,$3,$4)::jsonb as data`,
    [clientId, fromISO, toISO, custodian]
  );
  return rows?.[0]?.data ?? { tableData: [], periods: [], custodians: [] };
}

/* -------- API handler -------- */
export async function GET(req: NextRequest) {
  // 1) required user id
  const userId = Number(req.nextUrl.searchParams.get("user_id"));
  if (!Number.isFinite(userId) || userId <= 0) {
    return NextResponse.json({ error: "user_id is required" }, { status: 400 });
  }

  // 2) global optional filters (applied to every client)
  const sp = req.nextUrl.searchParams;
  const custodian = (sp.get("custodian") ?? sp.get("bank")) || null;

  const dateSingle = sp.get("date");
  const dateFrom = sp.get("date_from") ?? sp.get("start_date");
  const dateTo   = sp.get("date_to")   ?? sp.get("end_date");

  // choose a default range if none given:
  // we’ll default to today only; if you prefer “current month”, tweak here.
  const todayISO = new Date().toISOString().slice(0, 10);
  let fromISO: string | null = null;
  let toISO: string | null = null;

  if (dateFrom && dateTo) {
    fromISO = dateFrom; toISO = dateTo;
  } else if (dateFrom) {
    fromISO = dateFrom; toISO = dateFrom;
  } else if (dateTo) {
    fromISO = dateTo;   toISO = dateTo;
  } else if (dateSingle) {
    fromISO = dateSingle; toISO = dateSingle;
  }
  // else null → means “pick latest snapshot” per client (we’ll calculate below)

  const clients = await fetchClientsForUser(userId);
  const out: any[] = [];

  for (const c of clients) {
    const cid = c.id;

    // Strategy:
    // - If caller provided a range/day → use it once for that client
    // - Else (no date filters) → find latest as_of_date per client,
    //   then fetch that single day snapshot for consistent “latest view”
    let table: BankBlock[] = [];
    try {
      if (fromISO && toISO) {
        // one call with provided filters
        const data = await overviewRange(cid, fromISO, toISO, custodian);
        table = Array.isArray(data.tableData) ? data.tableData : [];
      } else {
        // latest snapshot:
        // 1) call wide to get periods, 2) pick max, 3) fetch that single day
        const wide = await overviewRange(cid, "1900-01-01", todayISO, custodian);
        const periods = Array.isArray(wide.periods) ? wide.periods : [];
        if (periods.length) {
          const latest = periods.sort().at(-1)!; // max ISO date string
          const snap = await overviewRange(cid, latest, latest, custodian);
          table = Array.isArray(snap.tableData) ? snap.tableData : [];
        } else {
          table = [];
        }
      }
    } catch {
      table = [];
    }

    // Build charts + summary from table
    const agg = buildAggregates(table);

    out.push({
      id: String(cid),
      name: c.name,
      pieChartData: { charts: agg.charts },
      summary: {
        code: c.code ?? undefined,
        total_custodians: agg.summary.total_custodians,
        net_assets_usd: agg.summary.net_assets_usd,
        total_assets_usd: agg.summary.total_assets_usd,
        total_debts_usd: agg.summary.total_debts_usd,
        status: "opened",
        app_status: "opened",
        starred: false,
      },
    });
  }

  return NextResponse.json({ clients: out });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({} as any));
  const url = new URL(req.url);
  if (body?.user_id != null) url.searchParams.set("user_id", String(body.user_id));
  if (body?.custodian != null) url.searchParams.set("custodian", String(body.custodian));
  if (body?.bank != null) url.searchParams.set("bank", String(body.bank));
  if (body?.date != null) url.searchParams.set("date", String(body.date));
  if (body?.date_from != null) url.searchParams.set("date_from", String(body.date_from));
  if (body?.date_to != null) url.searchParams.set("date_to", String(body.date_to));
  if (body?.start_date != null) url.searchParams.set("start_date", String(body.start_date));
  if (body?.end_date != null) url.searchParams.set("end_date", String(body.end_date));
  return GET(new NextRequest(url));
}
