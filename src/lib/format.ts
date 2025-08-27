// Clients>Assets>Overview

/** Safely coerce any input to a finite number */
const toNum = (v: unknown) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

/** USD currency with configurable fraction digits (default 0) */
export const fmtCurrency = (v: unknown, digits = 0) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(toNum(v));

/** USD with 2 decimals (shorthand) */
export const fmtCurrency2 = (v: unknown) => fmtCurrency(v, 2);

/** Optional helpers */
export const fmtCurrency0 = (v: unknown) => fmtCurrency(v, 0);
export const fmtCurrencyAbs = (v: unknown, digits = 0) =>
  fmtCurrency(Math.abs(toNum(v)), digits);

/** Percentage helper — returns a raw number (not a string). */
export const pct = (part: unknown, total: unknown) => {
  const p = toNum(total) === 0 ? 0 : (toNum(part) / toNum(total)) * 100;
  return Number.isFinite(p) ? p : 0;
};
