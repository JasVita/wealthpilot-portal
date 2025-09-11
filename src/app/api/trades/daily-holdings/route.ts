// src/app/api/trades/daily-holdings/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/lib/db";

const toYMD = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

// Simple title-case that capitalizes the first letter of each word,
// leaving symbols like "&" as-is.
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
    const dateParam     = url.searchParams.get("date");          // may be null | "" | "YYYY-MM-DD"
    const dateFromParam = url.searchParams.get("date_from");     // optional
    const dateToParam   = url.searchParams.get("date_to");       // optional
    const mode          = (url.searchParams.get("mode") || "raw").toLowerCase(); // "raw" | "agg"

    // Build WHERE
    const where: string[] = [];
    const params: any[] = [];

    if (dateFromParam && dateToParam) {
      where.push(`as_of_date::date BETWEEN $${params.length + 1} AND $${params.length + 2}`);
      params.push(dateFromParam, dateToParam);
    } else if (dateFromParam) {
      where.push(`as_of_date::date >= $${params.length + 1}`);
      params.push(dateFromParam);
    } else if (dateToParam) {
      where.push(`as_of_date::date <= $${params.length + 1}`);
      params.push(dateToParam);
    } else if (dateParam === null) {
      // default: current month → today
      const today = new Date();
      const start = new Date(today.getFullYear(), today.getMonth(), 1);
      where.push(`as_of_date::date BETWEEN $${params.length + 1} AND $${params.length + 2}`);
      params.push(toYMD(start), toYMD(today));
    } else if (dateParam.trim() === "") {
      // date= (empty) -> all history: no where clause
    } else {
      // single day
      where.push(`as_of_date::date = $${params.length + 1}`);
      params.push(dateParam);
    }

    const whereSQL = where.length ? `WHERE ${where.join(" AND ")}` : "";
    const pool = getPool();

    // Pull rows (explicit aliases → easy mapping)
    const sql = `
      SELECT
        id,
        asset_class,
        to_char(as_of_date::date, 'YYYY-MM-DD') AS as_of_date,
        bank, account, name, ticker, isin,
        currency, units, balance, security_key, price
      FROM daily.statement_holdings
      ${whereSQL}
      ORDER BY as_of_date::date ASC, id ASC
    `;
    const { rows } = await pool.query(sql, params);

    // Map → title-case assetClass
    const raw = (rows ?? []).map((r: any) => ({
      id: Number(r.id),
      assetClass: titleCaseWords(r.asset_class),            // ⬅️ title-cased
      asOfDate: r.as_of_date,                               // "YYYY-MM-DD"
      bank: r.bank,
      account: r.account,
      name: r.name,
      ticker: r.ticker ?? null,
      isin: r.isin ?? null,
      ccy: r.currency,
      units: r.units != null ? Number(r.units) : null,
      balance: r.balance != null ? Number(r.balance) : null,
      price: r.price != null ? Number(r.price) : null,
      securityKey: r.security_key ?? null,
    }));

    if (mode !== "agg") {
      return NextResponse.json({ rows: raw }, { headers: { "Cache-Control": "no-store" } });
    }

    // Aggregate over selection; keep a sensible assetClass label
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
    for (const r of raw) {
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
        prev.units += r.units ?? 0;
        prev.balance += r.balance ?? 0;
        prev.asOfDate = r.asOfDate;
        if (r.price != null) prev.price = r.price;
      }
    }

    const aggRows = Array.from(byKey.values()).map((a, i) => ({
      id: i + 1,
      assetClass: titleCaseWords("agg"),    // "Agg" to keep format consistent
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
  } catch (e) {
    console.error("[daily-holdings] error:", e);
    return NextResponse.json({ error: "query failed" }, { status: 500 });
  }
}
