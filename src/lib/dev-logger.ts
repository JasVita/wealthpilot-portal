// client/src/lib/dev-logger.ts
export const DEV_LOG = typeof window !== "undefined" && process.env.NEXT_PUBLIC_DEV_LOG === "1";
export const USE_MOCKS = typeof window !== "undefined" && process.env.NEXT_PUBLIC_USE_MOCKS === "1";

// A cute badge for console
export const pill = (text: string, bg = "#334155") =>
  [`%c ${text} `, `background:${bg}; color:#fff; padding:2px 6px; border-radius:6px; font-weight:700`] as const;

export function logRoute(route: string, payload: unknown, note?: string) {
  if (!DEV_LOG) return;
  console.groupCollapsed(...pill(route, "#6d28d9"), note ?? "");
  try {
    // short summary
    if (route.includes("overviews")) {
      const rows = (payload as any)?.overview_data ?? [];
      const months = rows.map((r: any) => r?.month_date).filter(Boolean);
      console.log(...pill("rows", "#0ea5e9"), rows.length, months);
      const charts = rows?.[0]?.pie_chart_data?.charts ?? [];
      const sum0 = (charts?.[0]?.data ?? []).reduce((a: number, b: number) => a + (Number(b) || 0), 0);
      console.log(...pill("total_net_worth", "#059669"), Intl.NumberFormat("en-US").format(sum0));
    } else if (route.includes("live-prices")) {
      const prices = (payload as any)?.prices ?? {};
      console.log(...pill("tickers", "#0ea5e9"), Object.keys(prices).length, Object.keys(prices).slice(0, 10));
    }

    // ready-to-copy block
    const str = JSON.stringify(payload, null, 2);
    console.log(...pill("COPY THIS JSON ↓", "#1f2937"));
    console.log(str.length > 40000 ? str.slice(0, 40000) + " …[truncated]" : str);
  } catch (e) {
    console.warn("logRoute failed:", e);
  }
  console.groupEnd();
}

/** Drop this in className to gray-out mock UI */
export const MOCK_UI = (
  mock?: boolean,
  opts: { badge?: boolean } = { badge: true }
) => (mock ? `u-mock ${opts.badge ? "u-mock-badge" : ""}` : "");
