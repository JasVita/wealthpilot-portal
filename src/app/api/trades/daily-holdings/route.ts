// src/app/api/trades/daily-holdings/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/lib/db";

const toYMD = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

// Title-case words but keep symbols like & etc.
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
    const dateParam     = url.searchParams.get("date");      // "", null or "YYYY-MM-DD"
    const dateFromParam = url.searchParams.get("date_from"); // optional
    const dateToParam   = url.searchParams.get("date_to");   // optional
    const mode          = (url.searchParams.get("mode") || "raw").toLowerCase(); // keep "agg" support if you still use it

    // ---- Resolve date range (inclusive) -----------------------------------
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
      // default: current month → today
      const today = new Date();
      const start = new Date(today.getFullYear(), today.getMonth(), 1);
      dateFrom = toYMD(start);
      dateTo   = toYMD(today);
    } else if (dateParam.trim() === "") {
      // all history (no bounds)
      dateFrom = null; dateTo = null;
    } else {
      // single day
      dateFrom = dateParam;
      dateTo   = dateParam;
    }

    const pool = getPool();

    // Allowed transaction types (case-insensitive)
    const allowedTypes = [
      "deposit placement",
      "fund subscription",
      "stock purchase",
      "note subscription",
      "bond purchase",
      "stock sell",
    ];

    // Build WHERE fragments (shared bounds for both CTEs)
    const whereH: string[] = [];
    const whereT: string[] = [`LOWER(transaction_type) = ANY($3)`]; // $3 is allowedTypes[]
    const params: any[] = []; // $1..$n

    if (dateFrom && dateTo) {
      whereH.push(`as_of_date::date BETWEEN $1 AND $2`);
      whereT.push(`value_date::date BETWEEN $1 AND $2`);
      params.push(dateFrom, dateTo);
    } else if (dateFrom) {
      whereH.push(`as_of_date::date >= $1`);
      whereT.push(`value_date::date >= $1`);
      params.push(dateFrom);
    } else if (dateTo) {
      whereH.push(`as_of_date::date <= $1`);
      whereT.push(`value_date::date <= $1`);
      params.push(dateTo);
    } else {
      // no date bounds → no where on dates
    }

    // $3 = allowed types (text array)
    params.push(allowedTypes);

    // -----------------------------------------------------------------------
    // Strategy:
    //  1) tx_isins: all distinct ISINs from statement_txn in the period
    //     where transaction_type IN allowed list
    //  2) hrows: holdings rows in the period, WITH row_number over each ISIN
    //     ordered by as_of_date DESC → rn = 1 is the latest within the period
    //  3) Return rn = 1 rows whose ISIN appears in tx_isins
    // -----------------------------------------------------------------------
    const sql = `
      WITH tx_isins AS (
        SELECT DISTINCT LOWER(isin) AS isin
        FROM daily.statement_txn
        ${whereT.length ? `WHERE ${whereT.join(" AND ")}` : ""}
          AND isin IS NOT NULL
      ),
      hrows AS (
        SELECT
          id,
          asset_class,
          as_of_date,
          bank,
          account,
          name,
          ticker,
          isin,
          currency,
          units,
          balance,
          security_key,
          price,
          ROW_NUMBER() OVER (
            PARTITION BY LOWER(isin)
            ORDER BY as_of_date DESC, id DESC
          ) AS rn
        FROM daily.statement_holdings
        ${whereH.length ? `WHERE ${whereH.join(" AND ")}` : ""}
          AND isin IS NOT NULL
      )
      SELECT
        h.id,
        h.asset_class,
        to_char(h.as_of_date::date, 'YYYY-MM-DD') AS as_of_date,
        h.bank, h.account, h.name, h.ticker, h.isin,
        h.currency, h.units, h.balance, h.security_key, h.price
      FROM hrows h
      JOIN tx_isins tx ON LOWER(h.isin) = tx.isin
      WHERE h.rn = 1
      ORDER BY h.as_of_date DESC, h.id DESC;
    `;

    const { rows } = await pool.query(sql, params);

    const payload = (rows ?? []).map((r: any) => ({
      id: Number(r.id),
      assetClass: titleCaseWords(r.asset_class),     // keep asset class for FE
      asOfDate:   r.as_of_date,                      // "YYYY-MM-DD" (you can ignore on FE)
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
      // If you still use ?mode=agg, aggregate the selected set by (bank, account, ccy, isin/name)
      // (kept from your previous version, unchanged)
      type Agg = {
        asOfDate: string;
        bank: string;
        account: string;
        name: string;
        isin: string | null;
        ccy: string;
        units: number;
        balance: number;
        price: number | null;
      };

      const byKey = new Map<string, Agg>();
      for (const r of payload) {
        const key = [r.bank, r.account, r.ccy, r.isin || r.name].join("|");
        const prev = byKey.get(key);
        if (!prev) {
          byKey.set(key, {
            asOfDate: r.asOfDate,
            bank: r.bank,
            account: r.account,
            name: r.name,
            isin: r.isin,
            ccy: r.ccy,
            units: r.units ?? 0,
            balance: r.balance ?? 0,
            price: r.price ?? null,
          });
        } else {
          prev.units   += r.units ?? 0;
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
