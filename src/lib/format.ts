// src/lib/format.ts
import type { CSSProperties } from "react";

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
export const fmtCurrencyAbs = (v: unknown, digits = 0) => fmtCurrency(Math.abs(toNum(v)), digits);

/** Short USD for charts (e.g. $83.2M, $1.5K) */
export const fmtShortUSD = (v: unknown) => {
  const n = toNum(v);
  const a = Math.abs(n);
  if (a >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(1)}B`;
  if (a >= 1_000_000)     return `$${(n / 1_000_000).toFixed(1)}M`;
  if (a >= 1_000)         return `$${(n / 1_000).toFixed(1)}K`;
  return fmtCurrency(n, 0);
};

/** Format numbers with thousands separators; defaults to 0–2 decimals. */
export const fmtNumber = (
  v: unknown,
  maxFractionDigits = 2,
  minFractionDigits = 0
): string => {
  const n = Number(v);
  if (!Number.isFinite(n)) return "—";
  return n.toLocaleString("en-US", {
    minimumFractionDigits: minFractionDigits,
    maximumFractionDigits: maxFractionDigits,
  });
};

/** Format Date | string to 'YYYY-MM-DD' (falls back gracefully if string is already ISO-ish). */
export const fmtYMD = (v?: Date | string | null): string => {
  if (!v) return "";
  const d = typeof v === "string" ? new Date(v) : v;
  if (!Number.isFinite(+d)) return String(v).slice(0, 10);
  return d.toISOString().slice(0, 10);
};

/** Percentage helper — returns a raw number (not a string). */
export const pct = (part: unknown, total: unknown) => {
  const p = toNum(total) === 0 ? 0 : (toNum(part) / toNum(total)) * 100;
  return Number.isFinite(p) ? p : 0;
};

/** Round to 2 decimals (Number → Number) */
export const r2 = (n: unknown) => Math.round((toNum(n) + Number.EPSILON) * 100) / 100;

/** Parse int or return undefined */
export const intOrUndef = (v: unknown): number | undefined => {
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
};

/** Safely get rows[] from a bucket which might be array | {rows} | undefined */
export const rowsOf = (cat: any): any[] => !cat ? [] : Array.isArray(cat) ? cat : Array.isArray(cat?.rows) ? cat.rows : [];

/** Row -> USD value (balanceUsd | balance) */
export const balanceVal = (row: any) => toNum(row?.balanceUsd ?? row?.balance ?? 0);

/** Sum a category block: prefer subtotalUsd, else sum rows[].balanceUsd/balance */
export const sumCategory = (cat: any): number => {
  if (!cat) return 0;
  if (typeof cat?.subtotalUsd === "number") return cat.subtotalUsd || 0;
  return rowsOf(cat).reduce((a: number, r: any) => a + balanceVal(r), 0);
};

export const sameDay = (a?: Date | null, b?: Date | null): boolean => {
  if (!a || !b) return false;
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
};

// Reusable CSS line clamp (works in Chromium/WebKit; needs a bounded width)
export const lineClamp = (lines: number): React.CSSProperties => ({
  display: "-webkit-box",
  WebkitLineClamp: lines,
  WebkitBoxOrient: "vertical",
  overflow: "hidden",
  textOverflow: "ellipsis",   // ← ensures ellipsis rendering where supported
  wordBreak: "break-word",
  overflowWrap: "anywhere",   // long tokens (UUIDs, filenames) still break
});


/** HSL→HEX */
function hslToHex(h: number, s: number, l: number) {
  s /= 100; l /= 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) =>
    l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  const toHex = (x: number) =>
    Math.round(255 * x).toString(16).padStart(2, "0");
  return `#${toHex(f(0))}${toHex(f(8))}${toHex(f(4))}`;
}

/** HEX→HSL (h in deg, s/l in %) */
function hexToHsl(hex: string): [number, number, number] {
  const s = hex.replace("#", "");
  const r = parseInt(s.substring(0, 2), 16) / 255;
  const g = parseInt(s.substring(2, 4), 16) / 255;
  const b = parseInt(s.substring(4, 6), 16) / 255;

  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;

  let h = 0, sat = 0;
  if (max !== min) {
    const d = max - min;
    sat = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h *= 60;
  }
  return [h, sat * 100, l * 100];
}

/** Distinct palette for any N using golden-angle hue spacing */
export const palette = (n: number): string[] => {
  const BASE = [
    "#22C55E", "#7C3AED", "#1D4ED8", "#14B8A6", 
    "#60a5fa", "#a78bfa", "#fbbf24", "#ef4444",
    "#f472b6", "#38bdf8", "#f87171", "#f59e0b",
  ];
  if (n <= BASE.length) return BASE.slice(0, n);

  const out: string[] = [];
  for (let i = 0; i < n; i++) {
    const baseHex = BASE[i % BASE.length];
    if (i < BASE.length) { out.push(baseHex); continue; }

    // ring 0 = base; ring 1 = first overflow, etc.
    const ring = Math.floor(i / BASE.length);

    // convert base to HSL
    const [h, s, l] = hexToHsl(baseHex);

    // gentle hue/lightness/saturation tweaks per ring to keep variants distinct
    const hueShift = ring % 3 === 1 ? 12 : ring % 3 === 2 ? -12 : 24;   // ±12° / 24°
    const l2 = Math.max(36, Math.min(74, l + (ring % 2 === 0 ? -7 : +7)));
    const s2 = Math.max(48, Math.min(70, s - 4));

    out.push(hslToHex((h + hueShift + 360) % 360, s2, l2));
  }
  return out;
};

/** Milliseconds → "hh:mm:ss" */
export const fmtHMS = (ms: number): string => {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return [h, m, s].map((v) => String(v).padStart(2, "0")).join(":");
};

/** Title-case a sentence ("cash & equivalents" -> "Cash & Equivalents") */
export const titleCase = (s: string | null | undefined) => {
  if (!s) return "";
  return s
    .toLowerCase()
    .replace(/\b([a-z])/g, (m) => m.toUpperCase());
};

/** Title-case by words but keep non-letters intact */
export const titleCaseWords = (s: string | null | undefined): string => {
  if (!s) return "";
  return s
    .split(/\s+/)
    .map((w) => (/[a-zA-Z]/.test(w[0] ?? "") ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");
};

/** Simple stable hash to index into a palette */
export const hashIndex = (s: string, mod: number) => {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h) % Math.max(1, mod);
};

const hexToRgb = (hex: string) => {
  const s = hex.replace("#", "");
  const r = parseInt(s.substring(0, 2), 16);
  const g = parseInt(s.substring(2, 4), 16);
  const b = parseInt(s.substring(4, 6), 16);
  return { r, g, b };
};

/** Mix a hex color with white by pct (0..1) and return CSS rgb() */
export const mixWithWhite = (hex: string, pct = 0.85) => {
  const { r, g, b } = hexToRgb(hex);
  const R = Math.round(r + (255 - r) * pct);
  const G = Math.round(g + (255 - g) * pct);
  const B = Math.round(b + (255 - b) * pct);
  return `rgb(${R}, ${G}, ${B})`;
};

/** Get a very light background + border + text color for a given label */
export const badgeColorsFor = (label: string) => {
  const pal = palette(24);
  const base = pal[hashIndex(label, pal.length)];
  return {
    text: base,
    bg: mixWithWhite(base, 0.87),    // very light background
    border: mixWithWhite(base, 0.70) // slightly darker border
  };
};