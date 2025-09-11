// src/app/api/trades/daily-transactions/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/lib/db";

const toYMD = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const dateParam = url.searchParams.get("date");       // optional single date
    const dateFromParam = url.searchParams.get("date_from");
    const dateToParam = url.searchParams.get("date_to");

    // Paging
    const page = Math.max(1, Number(url.searchParams.get("page") ?? 1));
    const pageSize = Math.min(200, Math.max(1, Number(url.searchParams.get("page_size") ?? 20)));
    const offset = (page - 1) * pageSize;

    // Build date range:
    let dateFrom: string | null = null;
    let dateTo: string | null = null;

    if (dateFromParam && dateToParam) {
      // explicit range takes precedence
      dateFrom = dateFromParam;
      dateTo = dateToParam;
    } else if (dateParam === null) {
      // default: current month to today
      const today = new Date();
      const start = new Date(today.getFullYear(), today.getMonth(), 1);
      dateFrom = toYMD(start);
      dateTo = toYMD(today);
    } else if (dateParam.trim() === "") {
      // empty => all history (no filter)
      dateFrom = null;
      dateTo = null;
    } else {
      // explicit single date => month-to-date
      const end = new Date(dateParam);
      if (!Number.isNaN(+end)) {
        const start = new Date(end.getFullYear(), end.getMonth(), 1);
        dateFrom = toYMD(start);
        dateTo = toYMD(end);
      }
    }

    const pool = getPool();

    // WHERE shared across queries
    const where: string[] = [];
    const params: any[] = [];
    if (dateFrom && dateTo) {
      where.push(`value_date::date BETWEEN $${params.length + 1} AND $${params.length + 2}`);
      params.push(dateFrom, dateTo);
    } else if (dateFrom) {
      where.push(`value_date::date >= $${params.length + 1}`);
      params.push(dateFrom);
    } else if (dateTo) {
      where.push(`value_date::date <= $${params.length + 1}`);
      params.push(dateTo);
    }
    const whereSQL = where.length ? `WHERE ${where.join(" AND ")}` : "";

    // Count
    const { rows: cntRows } = await pool.query(
      `SELECT COUNT(*) AS cnt FROM daily.statement_txn ${whereSQL}`,
      params
    );
    const total = Number(cntRows?.[0]?.cnt ?? 0);
    const totalPages = Math.max(1, Math.ceil(total / pageSize));

    // Categories (filtered set)
    const { rows: catRows } = await pool.query(
      `SELECT DISTINCT transaction_type AS category FROM daily.statement_txn ${whereSQL} ORDER BY category`,
      params
    );
    const categories: string[] = catRows.map((r: any) => r.category);

    // Data
    const dataSql = `
      SELECT
        id,
        transaction_type,
        to_char(value_date::date, 'YYYY-MM-DD') AS value_date,
        booking_text,
        description,
        account,
        amount,
        currency,
        amount_sign
      FROM daily.statement_txn
      ${whereSQL}
      ORDER BY value_date::date ASC, id ASC
      LIMIT $${params.length + 1}
      OFFSET $${params.length + 2}
    `;
    const dataParams = [...params, pageSize, offset];
    const { rows } = await pool.query(dataSql, dataParams);

    const mapped = (rows ?? []).map((r: any) => ({
      category: r.transaction_type,
      bookingText: r.booking_text,
      account: r.account,
      valueDate: r.value_date,                      // YYYY-MM-DD
      description: r.description,
      amount: r.amount != null ? Number(r.amount) : null,
      ccy: r.currency,
      amountSign: Number(r.amount_sign) === 1 ? "Inflow" : "Outflow",
    }));

    return NextResponse.json(
      { rows: mapped, categories, page, pageSize, total, totalPages },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (err) {
    console.error("[api/trades/daily-transactions] error:", err);
    return NextResponse.json({ error: "query failed" }, { status: 500 });
  }
}
