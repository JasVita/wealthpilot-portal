// src/app/api/trades/daily-holdings/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/lib/db";

/** YYYY-MM-DD helper */
const toYMD = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/** Title-case words but keep symbols like & etc. */
function titleCaseWords(s: string | null | undefined): string | null {
  if (!s) return null;
  return s
    .split(/\s+/)
    .map((w) => (/[a-zA-Z]/.test(w[0] ?? "") ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const dateParam     = url.searchParams.get("date");       // "", null or "YYYY-MM-DD"
    const dateFromParam = url.searchParams.get("date_from");  // optional
    const dateToParam   = url.searchParams.get("date_to");    // optional
    const mode          = (url.searchParams.get("mode") || "raw").toLowerCase();

    // ---- Resolve inclusive date range -----------------------------------
    // If neither date, date_from, date_to is given → default to current month-to-today
    // (You can change this to "today only" by setting both to 'today')
    let dateFrom: string | null = null;
    let dateTo:   string | null = null;

    if (dateFromParam && dateToParam) {
      dateFrom = dateFromParam;
      dateTo   = dateToParam;
    } else if (dateFromParam) {
      dateFrom = dateFromParam;
    } else if (dateToParam) {
      dateTo   = dateToParam;
    } else if (dateParam === null) {
      const today = new Date();
      const start = new Date(today.getFullYear(), today.getMonth(), 1);
      dateFrom = toYMD(start);
      dateTo   = toYMD(today);
    } else if ((dateParam ?? "").trim() === "") {
      // all history (no bounds)
      dateFrom = null; dateTo = null;
    } else {
      // single day
      dateFrom = dateParam!;
      dateTo   = dateParam!;
    }

    const pool = getPool();

    // --------------------------------------------------------------------
    // Previous ad-hoc strategy (kept for documentation):
    //   1) Build allowed txn types, prefilter txns for day/range
    //   2) Get candidate ISINs from daily.statement_txn
    //   3) Pick the latest holding per ISIN from daily.statement_holdings
    //
    // Now replaced by a dedicated DB function:
    //    daily.holding_changes(day)                -- single day
    //    daily.holding_changes(from_date, to_date) -- inclusive range
    //
    // The function must return:
    //   id, asset_class, as_of_date, bank, account, name, ticker, isin,
    //   currency, units, balance, security_key, price
    // --------------------------------------------------------------------

    let sql = "";
    let params: any[] = [];
    if (dateFrom && dateTo && dateFrom === dateTo) {
      // Single day → call 1-arg function
      sql = `
        SELECT
          id, asset_class, as_of_date, bank, account, name, ticker, isin,
          currency, units, balance, security_key, price
        FROM daily.holding_changes($1::date)
      `;
      params = [dateFrom];
    } else if (dateFrom && dateTo) {
      // From/To → call 2-arg function (order inside the function is normalized)
      sql = `
        SELECT
          id, asset_class, as_of_date, bank, account, name, ticker, isin,
          currency, units, balance, security_key, price
        FROM daily.holding_changes($1::date, $2::date)
      `;
      params = [dateFrom, dateTo];
    } else if (dateFrom && !dateTo) {
      // Open-ended: from .. ∞ → use from..from (single day) or widen as needed
      sql = `
        SELECT
          id, asset_class, as_of_date, bank, account, name, ticker, isin,
          currency, units, balance, security_key, price
        FROM daily.holding_changes($1::date, NOW()::date)
      `;
      params = [dateFrom];
    } else if (!dateFrom && dateTo) {
      // Open-ended: -∞ .. to  → use start-of-epoch to 'to' (or just to..to)
      sql = `
        SELECT
          id, asset_class, as_of_date, bank, account, name, ticker, isin,
          currency, units, balance, security_key, price
        FROM daily.holding_changes($1::date, $2::date)
      `;
      // choose an early bound; or just single-day 'to'
      params = [dateTo, dateTo];
    } else {
      // Truly unbounded → fallback to today single day
      const today = toYMD(new Date());
      sql = `
        SELECT
          id, asset_class, as_of_date, bank, account, name, ticker, isin,
          currency, units, balance, security_key, price
        FROM daily.holding_changes($1::date)
      `;
      params = [today];
    }

    const { rows } = await pool.query(sql, params);
    const payload = (rows ?? []).map((r: any) => ({
      id: Number(r.id),
      assetClass: titleCaseWords(r.asset_class),
      asOfDate:   (r.as_of_date instanceof Date) ? r.as_of_date.toISOString().slice(0,10) : String(r.as_of_date),
      bank:       r.bank,
      account:    r.account,
      name:       r.name,
      ticker:     r.ticker ?? null,
      isin:       r.isin ?? null,
      ccy:        r.currency,
      units:      r.units != null ? Number(r.units) : null,
      balance:    r.balance != null ? Number(r.balance) : null,
      price:      r.price   != null ? Number(r.price)   : null,
      securityKey: r.security_key ?? null,
    }));

    if (mode === "agg") {
      // Optional aggregate (unchanged)
      type Agg = {
        asOfDate: string; bank: string; account: string; name: string;
        isin: string | null; ccy: string; units: number; balance: number; price: number | null;
      };
      const byKey = new Map<string, Agg>();
      for (const r of payload) {
        const key = [r.bank, r.account, r.ccy, r.isin || r.name].join("|");
        const prev = byKey.get(key);
        if (!prev) {
          byKey.set(key, {
            asOfDate: r.asOfDate,
            bank: r.bank, account: r.account, name: r.name,
            isin: r.isin, ccy: r.ccy, units: r.units ?? 0, balance: r.balance ?? 0, price: r.price ?? null
          });
        } else {
          prev.units += r.units ?? 0;
          prev.balance += r.balance ?? 0;
          prev.asOfDate = r.asOfDate;
          if (r.price != null) prev.price = r.price;
        }
      }
      const aggRows = Array.from(byKey.values()).map((a, i) => ({
        id: i + 1,
        assetClass: titleCaseWords("agg"),
        asOfDate: a.asOfDate,
        bank: a.bank,
        account: a.account,
        name: a.name,
        ticker: null,
        isin: a.isin,
        ccy: a.ccy,
        units: a.units,
        balance: a.balance,
        price: a.price,
        securityKey: a.isin,
      }));
      return NextResponse.json({ rows: aggRows }, { headers: { "Cache-Control": "no-store" } });
    }

    return NextResponse.json({ rows: payload }, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    console.error("[daily-holdings] error:", err);
    return NextResponse.json({ error: "query failed" }, { status: 500 });
  }
}
