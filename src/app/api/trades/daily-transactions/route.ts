// src/app/api/trades/daily-transactions/route.ts -- update to fetch dat with function later!!!
import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/lib/db";

const toYMD = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

// very light title-case for booking text
function titleCase(s: string | null | undefined) {
  if (!s) return "";
  return s
    .toLowerCase()
    .replace(/\b([a-z])/g, (m) => m.toUpperCase())
    .replace(/\bUsd\b/gi, "USD")
    .replace(/\bEur\b/gi, "EUR")
    .replace(/\bHkd\b/gi, "HKD");
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);

    const dateParam     = url.searchParams.get("date");
    const dateFromParam = url.searchParams.get("date_from");
    const dateToParam   = url.searchParams.get("date_to");

    const qRaw   = (url.searchParams.get("q") ?? "").trim();
    const acctsS = (url.searchParams.get("accts") ?? "").trim();
    const accounts = acctsS ? acctsS.split(",").map(s => s.trim()).filter(Boolean) : [];

    // Paging
    const page = Math.max(1, Number(url.searchParams.get("page") ?? 1));
    const pageSize = Math.min(200, Math.max(1, Number(url.searchParams.get("page_size") ?? 20)));
    const offset = (page - 1) * pageSize;

    // Build date range
    let dateFrom: string | null = null;
    let dateTo: string | null = null;

    if (dateFromParam && dateToParam) {
      dateFrom = dateFromParam;
      dateTo = dateToParam;
    } else if (dateParam === null) {
      // default: current month → today
      const today = new Date();
      const start = new Date(today.getFullYear(), today.getMonth(), 1);
      dateFrom = toYMD(start);
      dateTo = toYMD(today);
    } else if ((dateParam ?? "").trim() === "") {
      // all history
      dateFrom = null;
      dateTo = null;
    } else {
      // month-to-date for the given day
      const end = new Date(dateParam!);
      if (!Number.isNaN(+end)) {
        const start = new Date(end.getFullYear(), end.getMonth(), 1);
        dateFrom = toYMD(start);
        dateTo = toYMD(end);
      }
    }

    const pool = getPool();

    // WHERE builder (shared)
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

    // accounts filter
    if (accounts.length) {
      where.push(`account = ANY($${params.length + 1})`);
      params.push(accounts);
    }

    // search filter (description / account / booking_text / category / CCY / file_name + "inflow/outflow")
    if (qRaw) {
      const like = `%${qRaw}%`;
      const qLow = qRaw.toLowerCase();
      const pLike = params.length + 1;
      const pIn   = pLike + 1;
      const pOut  = pLike + 2;

      where.push(`(
        booking_text ILIKE $${pLike} OR
        description  ILIKE $${pLike} OR
        account      ILIKE $${pLike} OR
        transaction_type ILIKE $${pLike} OR
        currency     ILIKE $${pLike} OR
        file_name    ILIKE $${pLike} OR
        ($${pIn}  = 'inflow'  AND amount_sign = 1) OR
        ($${pOut} = 'outflow' AND amount_sign = -1)
      )`);
      params.push(like, qLow, qLow);
    }

    const whereSQL = where.length ? `WHERE ${where.join(" AND ")}` : "";

    // ----- Count (for pagination) over the filtered dataset
    const { rows: cntRows } = await pool.query(
      `SELECT COUNT(*) AS cnt FROM daily.statement_txn ${whereSQL}`,
      params
    );
    const total = Number(cntRows?.[0]?.cnt ?? 0);
    const totalPages = Math.max(1, Math.ceil(total / pageSize));

    // ----- Pill counts by category (over the full filtered dataset)
    const { rows: pillRows } = await pool.query(
      `SELECT transaction_type AS category, COUNT(*)::bigint AS cnt
       FROM daily.statement_txn
       ${whereSQL}
       GROUP BY 1
       ORDER BY 1`,
      params
    );
    const pillCounts: Record<string, number> =
      Object.fromEntries(pillRows.map((r: any) => [r.category, Number(r.cnt)]));

    // Optional: category list (sorted)
    const categories = Object.keys(pillCounts).sort();

    // ----- Data (paginated)
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
        amount_sign,
        file_name
      FROM daily.statement_txn
      ${whereSQL}
      ORDER BY value_date::date ASC, id ASC
      LIMIT $${params.length + 1}
      OFFSET $${params.length + 2}
    `;
    const dataParams = [...params, pageSize, offset];
    const { rows } = await pool.query(dataSql, dataParams);

    const mapped = (rows ?? []).map((r: any) => ({
      category:    r.transaction_type,
      bookingText: titleCase(r.booking_text),
      account:     r.account,
      valueDate:   r.value_date,                    // YYYY-MM-DD
      description: r.description,
      amount:      r.amount != null ? Number(r.amount) : null,
      ccy:         r.currency,
      amountSign:  Number(r.amount_sign) === 1 ? "Inflow" : "Outflow",
      fileName:    r.file_name ?? null,
    }));

    return NextResponse.json(
      { rows: mapped, categories, pillCounts, page, pageSize, total, totalPages },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (err) {
    console.error("[api/trades/daily-transactions] error:", err);
    return NextResponse.json({ error: "query failed" }, { status: 500 });
  }
}
