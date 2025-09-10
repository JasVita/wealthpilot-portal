import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/lib/db";

/**
 * GET /api/trades/daily-transactions
 *
 * Query params:
 * - date=YYYY-MM-DD
 *    • If provided: rows from the first day of that month up to 'date' (inclusive)
 *    • If omitted:  rows for current month (1st → today)
 *    • If empty (?date=): no date filter (all history)
 * - page=number (1-based, default 1)
 * - page_size=number (optional; default 20, max 200)
 *
 * curl -sS "http://localhost:3001/api/trades/daily-transactions"                  Default (current month → today, page 1, 20 rows):
 * curl -sS "http://localhost:3001/api/trades/daily-transactions?date=2025-07-08"  Selected date (e.g. 2025-07-08 → July 1 → 2025-07-08):
 * curl -sS "http://localhost:3001/api/trades/daily-transactions?date="            All history (empty date):
 * 
 */
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const dateParam = url.searchParams.get("date"); // can be null, "", or "YYYY-MM-DD"

    // Pagination
    const page = Math.max(1, Number(url.searchParams.get("page") ?? 1));
    const pageSize = Math.min(
      200,
      Math.max(1, Number(url.searchParams.get("page_size") ?? 20))
    );
    const offset = (page - 1) * pageSize;

    // Compute date range behavior
    // - ""  -> no filter (all)
    // - null -> default: current month start -> today
    // - "YYYY-MM-DD" -> start of that month -> given date
    let dateFrom: string | null = null;
    let dateTo: string | null = null;

    const toYMD = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
        d.getDate()
      ).padStart(2, "0")}`;

    if (dateParam === null) {
      // default: current month to today
      const today = new Date();
      const start = new Date(today.getFullYear(), today.getMonth(), 1);
      dateFrom = toYMD(start);
      dateTo = toYMD(today);
    } else if (dateParam.trim() === "") {
      // empty => all history (no date constraint)
      dateFrom = null;
      dateTo = null;
    } else {
      // explicit date => start of that month to the selected date
      const end = new Date(dateParam);
      if (!Number.isNaN(+end)) {
        const start = new Date(end.getFullYear(), end.getMonth(), 1);
        dateFrom = toYMD(start);
        dateTo = toYMD(end);
      } else {
        // bad date -> treat as no filter
        dateFrom = null;
        dateTo = null;
      }
    }

    const pool = getPool();

    // --- Build WHERE + params once and reuse for count, categories, and data
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

    // --- Total count for pagination (over filtered dataset)
    const countSql = `
      SELECT COUNT(*) AS cnt
      FROM daily.statement_txn_2
      ${whereSQL}
    `;
    const { rows: countRows } = await pool.query(countSql, params);
    const total = Number(countRows?.[0]?.cnt ?? 0);
    const totalPages = Math.max(1, Math.ceil(total / pageSize));

    // --- Distinct categories (over filtered dataset)
    const catSql = `
      SELECT DISTINCT transaction_type AS category
      FROM daily.statement_txn_2
      ${whereSQL}
      ORDER BY category
    `;
    const { rows: catRows } = await pool.query(catSql, params);
    const categories: string[] = catRows.map((r: any) => r.category);

    // --- Data query with pagination
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
      FROM daily.statement_txn_2
      ${whereSQL}
      ORDER BY value_date::date ASC, id ASC
      LIMIT $${params.length + 1}
      OFFSET $${params.length + 2}
    `;
    const dataParams = [...params, pageSize, offset];
    const { rows } = await pool.query(dataSql, dataParams);

    // --- Map rows with required field order and friendly sign
    const mapped = (rows ?? []).map((r: any) => {
      const sign = Number(r.amount_sign);
      const flow = sign === 1 ? "Inflow" : "Outflow";

      return {
        category: r.transaction_type,          // 1
        bookingText: r.booking_text,           // 2
        account: r.account,                    // 3
        valueDate: r.value_date,               // 4 (YYYY-MM-DD)
        description: r.description,            // 5
        amount: r.amount != null ? Number(r.amount) : null, // 6
        ccy: r.currency,                       // 7
        amountSign: flow as "Inflow" | "Outflow",  // 8
      };
    });

    return NextResponse.json(
      {
        rows: mapped,
        categories,
        page,
        pageSize,
        total,
        totalPages,
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (err: any) {
    console.error("[api/trades/daily-transactions] error:", err);
    return NextResponse.json({ error: "query failed" }, { status: 500 });
  }
}
