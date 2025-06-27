import { z } from "zod";

export const PieChartSchema = z.object({
  title: z.string(),
  labels: z.array(z.string()).default([]),
  data: z.array(z.number()).default([]),
  colors: z.array(z.string()).default([]),
});

export const PieChartResponseSchema = z.object({
  charts: z.array(PieChartSchema).default([]),
});

export const CashEquivSchema = z.object({
  asset_name: z.string().optional(),
  balance_USD: z.number().optional(),
});

export const FixedIncBondSchema = z.object({
  bond_name: z.string().optional(),
  face_value: z.number().optional(),
  market_value_USD: z.number().optional(),
});

export const FixedIncFundSchema = z.object({
  fund_name: z.string().optional(),
  units: z.number().optional(),
  market_value_USD: z.number().optional(),
});

export const EquityHoldingSchema = z.object({
  stock_name: z.string().optional(),
  number_of_shares: z.number().optional(),
  market_value_USD: z.number().optional(),
});

export const StructProductSchema = z.object({
  product_name: z.string().optional(),
  notional_USD: z.number().optional(),
  market_value_USD: z.number().optional(),
});

export const LoanRowSchema = z.object({
  loan_description: z.string().optional(),
  outstanding_balance_USD: z.number().optional(),
});

export const StockTableSchema = z.object({
  bank: z.string(),
  as_of_date: z.string(),
  cash_and_equivalents: z.array(CashEquivSchema).optional(),
  direct_fixed_income: z.array(FixedIncBondSchema).optional(),
  fixed_income_funds: z.array(FixedIncFundSchema).optional(),
  direct_equities: z.array(EquityHoldingSchema).optional(),
  equities_fund: z.array(FixedIncFundSchema).optional(),
  alternative_fund: z.array(FixedIncFundSchema).optional(),
  structured_products: z.array(StructProductSchema).optional(),
  loans: z.array(LoanRowSchema).optional(),
});

export const FullServerResponseSchema = z.object({
  Pie_chart: PieChartResponseSchema.optional(),
  Table: z.array(StockTableSchema).default([]),
  File_IDs: z.array(z.string()).optional(),
  Excel_Report_URL: z.string().optional(),
});

// TypeScript types from schema
export type PieChart = z.infer<typeof PieChartSchema>;
export type PieChartResponse = z.infer<typeof PieChartResponseSchema>;
export type StockTable = z.infer<typeof StockTableSchema>;
export type FullServerResponse = z.infer<typeof FullServerResponseSchema>;
export type PieData = {
  labels: string[];
  datasets: {
    data: number[];
    backgroundColor: string[];
  }[];
};
export type Message = {
  content: string;
  isUser: boolean;
  timestamp?: string;
  isLoading?: boolean;
};

export interface AlertItem {
  title: string;
  description: string;
  recommendation: string;
  category:
    | "1. Large/irregular fund movements"
    | "2. Concentration or high-risk portfolio issues"
    | "3. Maturity reminders (bonds, deposits, policies)"
    | "4. Low liquidity or excessive idle cash"
    | "5. AUM or performance fluctuations"
    | "6. Compliance issues (KYC/AML/documents)"
    | "7. Market event match for held positions";
}

export interface NewsItem {
  stock: string;
  title: string;
  summary: string;
  publication_time: string;
  source: string;
  trading_insight: string;
  impact: string;
}

/* ───────────────────────────────────────────────────────────────────────── *\
|*  Core “bucket” keys that can appear in each bank table object             *|
\* ───────────────────────────────────────────────────────────────────────── */
export type BankTableKey =
  | "cash_and_equivalents"
  | "direct_fixed_income"
  | "fixed_income_funds"
  | "direct_equities"
  | "equities_fund"
  | "alternative_fund"
  | "structured_products"
  | "loans";

/* ───────────────────────────────────────────────────────────────────────── *\
|*  The shape of **one** bank record in `uiTables`                           *|
\* ───────────────────────────────────────────────────────────────────────── */
export interface BankEntry {
  bank: string; // "UBS", "HSBC", …
  as_of_date: string; // "30-04-2025", …

  /* buckets (each may be empty) */
  cash_and_equivalents: any[];
  direct_fixed_income: any[];
  fixed_income_funds: any[];
  direct_equities: any[];
  equities_fund: any[];
  alternative_fund: any[];
  structured_products: any[];
  loans: any[];
}

/* Alias if you ever want to talk about the table object itself */
export type BankTables = Pick<BankEntry, BankTableKey>; // { cash_and_equivalents: any[]; … }

/* ───────────────────────────────────────────────────────────────────────── *\
|*  What actually gets pushed to `addUploadBatch`                            *|
\* ───────────────────────────────────────────────────────────────────────── */
export interface UploadBatch {
  /** S3 (or presigned) URLs in the same order the user uploaded them */
  urls: string[];

  /** Parsed results straight from your existing `uiTables` array */
  banks: BankEntry[];

  /** Display helpers like "UBS [30-04-2025]" built while mapping */
  bankTags: string[];

  /** URL to download excel file */
  excelURL: string;
}

// types and helpers
/* --------------------------------------------------------------
 *  Types
 * -------------------------------------------------------------- */
type StructuredProductSrc = {
  product_name: string;
  notional_USD: number;
  market_value_USD: number;
};

type BankSnapshot = {
  bank: string;
  as_of_date: string;
  structured_products: StructuredProductSrc[];
  // ...other categories we ignore here
};

export type Product = {
  id: string; // bank-scoped id, e.g. “J.P. Morgan-1”
  bank: string;
  isin: string;
  productName: string;
  productType: string;
  notional: string; // formatted “$123,456”
  marketValue: string; // formatted “$123,456”
  portfolioPercent: string; // “4.2%”
  issueDate: string; // “YYYY-MM-DD” | “N/A”
  maturity: string; // “YYMMDD” | “N/A”
  strike: string; // “N/A” (placeholder for now)
  unrealizedPL: string; // “+$12,345” | “-$…” | “$0”
  unrealizedPLColor: "positive" | "negative";
};

/* --------------------------------------------------------------
 *  Helper – small regex utilities
 * -------------------------------------------------------------- */
const ISIN_RE = /\b([A-Z]{2}[A-Z0-9]{9}[0-9])\b/; // very loose
const SIX_DIGIT_DATE_RE = /\b(\d{6})\b/; // e.g. 061025
const ISSUE_DATE_RE = /\((\d{4}-\d{2}-\d{2})/; // (2024-12-06

const fmtUSD = (val: number) =>
  Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(val);

const fmtPct = (val: number) =>
  Intl.NumberFormat("en-US", { style: "percent", minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(val);

/* --------------------------------------------------------------
 *  Main transformer
 * -------------------------------------------------------------- */
export function buildStructuredProductTable(
  snapshotsInput: StockTable | StockTable[] | undefined // ← union
): Product[] {
  // Normalise to an array so downstream logic never breaks
  const snapshots: StockTable[] = Array.isArray(snapshotsInput)
    ? snapshotsInput
    : snapshotsInput
    ? [snapshotsInput]
    : [];

  /* ---------- total portfolio calc (unchanged) ---------- */
  const totalPortfolioUSD = snapshots.reduce((sum, snap) => {
    const catTotals = Object.values(snap)
      .filter(Array.isArray)
      .flat()
      .reduce((s: number, row: any) => s + (row.market_value_USD ?? row.balance_USD ?? 0), 0);
    return sum + catTotals;
  }, 0);

  /* ---------- flatten & map (only 2 tiny tweaks) ---------- */
  return snapshots.flatMap((snap) => {
    const prods = snap.structured_products ?? []; // 🆕 safe fallback

    return prods.map((sp, idx): Product => {
      const id = `${snap.bank}-${idx + 1}`;

      const isinMatch = sp.product_name?.match(ISIN_RE);
      const maturityMatch = sp.product_name?.match(SIX_DIGIT_DATE_RE);
      const issueMatch = sp.product_name?.match(ISSUE_DATE_RE);

      const tokens = sp.product_name?.split(/\s+/) ?? [];
      const productType = tokens[1] ?? "N/A";

      const notional = sp.notional_USD ?? 0;
      const mktValue = sp.market_value_USD ?? 0;
      const unrealized = mktValue - notional;
      const unrealColor = unrealized > 0 ? "positive" : "negative";

      return {
        id,
        bank: snap.bank,
        isin: isinMatch ? isinMatch[1] : "N/A",
        productName: sp.product_name ?? "N/A",
        productType,
        notional: fmtUSD(notional),
        marketValue: fmtUSD(mktValue),
        portfolioPercent: totalPortfolioUSD ? fmtPct(mktValue / totalPortfolioUSD) : "0.0%",
        issueDate: issueMatch ? issueMatch[1] : "N/A",
        maturity: maturityMatch ? maturityMatch[1] : "N/A",
        strike: "N/A",
        unrealizedPL: `${unrealized >= 0 ? "+" : ""}${fmtUSD(Math.abs(unrealized))}`,
        unrealizedPLColor: unrealColor,
      };
    });
  });
}

type QuarterRow = {
  quarter: string; // e.g. "Q3-25"
  [bank: string]: number | string; // banks → numbers, metadata → strings
};

/* ───────────────────────────────────────────────────────────────────────── *\
|*  Extract a JS Date from funky product names                              *|
\* ───────────────────────────────────────────────────────────────────────── */
const SIX_DIGIT_RE = /\b(\d{6})\b/; // 061025  (DDMMYY)
const ISO_BRACKET_RE = /\((\d{4})-(\d{2})\.(\d{2})\.(\d{4})\)/; // (2025-24.11.2025)
const ISO_RE = /\b(\d{4})-(\d{2})-(\d{2})\b/; // 2025-10-06

function parseMaturity(raw: string | undefined): Date | null {
  if (!raw) return null;

  const iso = raw.match(ISO_RE);
  if (iso) return new Date(`${iso[1]}-${iso[2]}-${iso[3]}`);

  const bracket = raw.match(ISO_BRACKET_RE);
  if (bracket) return new Date(`${bracket[4]}-${bracket[2]}-${bracket[3]}`);

  const six = raw.match(SIX_DIGIT_RE);
  if (six) {
    const dd = six[1].slice(0, 2);
    const mm = six[1].slice(2, 4);
    const yy = six[1].slice(4, 6);
    const yr = Number(yy) + 2000; // assume 20xx
    return new Date(`${yr}-${mm}-${dd}`);
  }
  return null;
}

/* ───────────────────────────────────────────────────────────────────────── *\
|*  Group every product’s notional into year-quarters per bank              *|
\* ───────────────────────────────────────────────────────────────────────── */
export function buildMaturityChartData(snapshotsInput: StockTable | StockTable[] | undefined): QuarterRow[] {
  const snapshots: StockTable[] = Array.isArray(snapshotsInput)
    ? snapshotsInput
    : snapshotsInput
    ? [snapshotsInput]
    : [];

  // map<quarter, map<bank, totalUSD>>
  const bucket = new Map<string, Map<string, number>>();

  snapshots.forEach((snap) => {
    const prods = snap.structured_products ?? [];
    prods.forEach((p) => {
      const date = parseMaturity(p.product_name);
      if (!date) return;

      const q = Math.floor(date.getUTCMonth() / 3) + 1;
      const quarterKey = `Q${q}-${String(date.getUTCFullYear()).slice(-2)}`;

      const bankMap = bucket.get(quarterKey) ?? new Map<string, number>();
      const prev = bankMap.get(snap.bank) ?? 0;
      bankMap.set(snap.bank, prev + (p.notional_USD ?? 0));
      bucket.set(quarterKey, bankMap);
    });
  });

  // Turn the Map structure into the array Recharts expects
  const rows: QuarterRow[] = [];
  bucket.forEach((bankMap, quarter) => {
    const row: QuarterRow = { quarter };
    ["Goldman Sachs", "Morgan Stanley", "JP Morgan", "UBS"].forEach((bk) => {
      row[bk] = Number(((bankMap.get(bk) ?? 0) / 1_000_000).toFixed(2)); // USD->MM
    });
    rows.push(row);
  });

  // sort chronologically
  rows.sort((a, b) => a.quarter.localeCompare(b.quarter, undefined, { numeric: true }));

  return rows;
}

type PieRow = { name: string; value: number; color: string };

/* Bank → colour map (matches your current design order) */
const COLOR_MAP: Record<string, string> = {
  "Goldman Sachs": "#0CA3A3",
  "Morgan Stanley": "#11223D",
  "JP Morgan": "#8B5CF6",
  UBS: "#F59E0B",
};

/* helper to normalise snapshot.bank → canonical name */
function canonical(bank: string): string | null {
  const b = bank.toLowerCase();
  if (b.includes("goldman")) return "Goldman Sachs";
  if (b.includes("morgan stanley")) return "Morgan Stanley";
  if (b.includes("j.p. morgan") || b.includes("jp morgan")) return "JP Morgan";
  if (b.includes("ubs")) return "UBS";
  return null; // ignore other counterparties for this chart
}

/* ------------------------------------------------------------------ */
/*  Build the array that <PieChart> expects                            */
/* ------------------------------------------------------------------ */
export function buildCounterpartyRiskData(snapshotsInput: StockTable | StockTable[] | undefined): PieRow[] {
  // normalise arg to array
  const snaps: StockTable[] = Array.isArray(snapshotsInput) ? snapshotsInput : snapshotsInput ? [snapshotsInput] : [];

  // aggregate exposure per canonical bank name
  const bucket = new Map<string, number>();

  snaps.forEach((snap) => {
    const name = canonical(snap.bank);
    if (!name) return; // skip unknown banks

    const exposure = (snap.structured_products ?? []).reduce(
      (sum, p) => sum + (p.market_value_USD ?? p.notional_USD ?? 0),
      0
    );

    bucket.set(name, (bucket.get(name) ?? 0) + exposure);
  });

  // total across the 4 counterparties
  const total = [...bucket.values()].reduce((s, v) => s + v, 0) || 1; // avoid div-by-0

  // emit rows in the fixed colour order
  return (["Goldman Sachs", "Morgan Stanley", "JP Morgan", "UBS"] as const).map((name) => ({
    name,
    value: Number((((bucket.get(name) ?? 0) * 100) / total).toFixed(1)), // % with 1-dp
    color: COLOR_MAP[name],
  }));
}

export type docid = { PK: string; SK: string };
