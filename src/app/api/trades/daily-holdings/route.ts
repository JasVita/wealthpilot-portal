// src/app/api/trades/daily-holdings/route.ts
// curl -s "http://localhost:3001/api/trades/daily-holdings?date=2025-08-25"
import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/lib/db";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const date = url.searchParams.get("date");        // YYYY-MM-DD
  const mode = (url.searchParams.get("mode") || "raw").toLowerCase(); // "raw" | "agg"

  if (!date) {
    return NextResponse.json({ error: "date (YYYY-MM-DD) is required" }, { status: 400 });
  }

  try {
    const pool = getPool();
    const q = `
      select id, type, as_of_date, bank, account, name, ticker, isin,
             currency, units, balance, security_key, price
      from daily.trade_dailyTxn_get_date_holdings($1)
    `;
    const { rows } = await pool.query(q, [date]);

    const raw = (rows ?? []).map((r: any) => ({
      id: Number(r.id),
      type: r.type,
      asOfDate: r.as_of_date,   // string ISO
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

    // ---- Simple aggregation: group by bank/account/ccy + (isin || name) ----
    type Agg = {
      asOfDate: string;
      bank: string;
      account: string;
      name: string;
      isin: string | null;
      ccy: string;
      units: number;
      balance: number;
      price: number | null; // last price observed
    };

    const byKey = new Map<string, Agg>();
    for (const r of raw) {
      const key = [
        r.bank,
        r.account,
        r.ccy,
        r.isin || r.name, // prefer isin when present
      ].join("||");

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
        // keep latest asOfDate + price we see (rows are up to date)
        prev.asOfDate = r.asOfDate;
        if (r.price != null) prev.price = r.price;
      }
    }

    const aggRows = Array.from(byKey.values()).map((a, i) => ({
      id: i + 1,
      type: "agg",
      asOfDate: a.asOfDate,
      bank: a.bank,
      account: a.account,
      name: a.name,
      ticker: null,       // in agg we show name + isin; you can keep ticker if you want
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
