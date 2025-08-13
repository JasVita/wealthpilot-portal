"use client";

import Link from "next/link";
import { usePathname, useParams } from "next/navigation";
import { useEffect, useMemo, useState, createContext, useCallback } from "react";
import axios from "axios";
import { useClientStore } from "@/stores/clients-store";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircleIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title as ChartTitle,
  Tooltip,
  Filler,
  Legend,
} from "chart.js";
import { MOCK_UI, USE_MOCKS, logRoute, pill } from "@/lib/dev-logger";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, ChartTitle, Tooltip, Filler, Legend);

/** Context: sub-tabs (e.g. Holdings) register an Export handler here */
export const AssetsExportContext = createContext<(fn?: () => void) => void>(() => {});

const TABS = [
  { slug: "holdings", label: "Holdings" },
  { slug: "cash", label: "Cash Distribution" },
  { slug: "analysis", label: "Analysis" },
  { slug: "pnl", label: "Profit & Loss" },
  { slug: "statement", label: "Statement" },
  { slug: "report", label: "Report" },
];

type OverviewRow = {
  month_date: string;
  table_data: any;
  pie_chart_data: { charts: { data: number[]; labels: string[]; colors: string[]; title: string }[] };
};

const assetKeys = [
  "cash_and_equivalents",
  "direct_fixed_income",
  "fixed_income_funds",
  "direct_equities",
  "equities_fund",
  "alternative_fund",
  "structured_products",
  "loans",
] as const;

const assetLabels: Record<(typeof assetKeys)[number], string> = {
  cash_and_equivalents: "Cash & Equivalents",
  direct_fixed_income: "Direct Fixed Income",
  fixed_income_funds: "Fixed Income Funds",
  direct_equities: "Direct Equities",
  equities_fund: "Equity Funds",
  alternative_fund: "Alternative Funds",
  structured_products: "Structured Products",
  loans: "Loans",
};

const keyAliases: Record<(typeof assetKeys)[number], string[]> = {
  cash_and_equivalents: ["cashAndEquiv", "cash_and_equivalents", "cashAndEquivalents"],
  direct_fixed_income: ["directFixedIncome", "direct_fixed_income"],
  fixed_income_funds: ["fixedIncomeFunds", "fixed_income_funds"],
  direct_equities: ["directEquities", "direct_equities"],
  equities_fund: ["equityFunds", "equities_fund"],
  alternative_fund: ["alternativeFunds", "alternative_fund"],
  structured_products: ["structuredProducts", "structured_products"],
  loans: ["loans"],
};

const fmtCurrency = (v: number, digits = 0) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(v);

const parseDate = (s: string) => new Date(s);

function Kpi({ title, value, caption }: { title: string; value: string; caption?: string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm text-muted-foreground">{title}</CardTitle>
        {caption ? <CardDescription>{caption}</CardDescription> : null}
      </CardHeader>
      <CardContent>
        <div className="text-2xl md:text-3xl font-semibold tracking-tight">{value}</div>
      </CardContent>
    </Card>
  );
}

export default function AssetsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { clientId } = useParams<{ clientId: string }>();
  const { setCurrClient, currClient } = useClientStore();

  // where sub-tabs register their export handler
  const [exporter, setExporter] = useState<(() => void) | undefined>(undefined);

  // ✅ wrapper so we set a function value (not an updater)
  const registerExporter = useCallback((fn?: () => void) => {
    setExporter(() => fn);   // store the function without invoking it
  }, []);

  useEffect(() => {
    if (clientId) setCurrClient(clientId);
  }, [clientId, setCurrClient]);

  // ---- Overview state (shared at top of every assets subtab) ----
  const [overviews, setOverviews] = useState<OverviewRow[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "error" | "ready">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (!currClient) return;
    (async () => {
      setStatus("loading");
      try {
        const route = `${process.env.NEXT_PUBLIC_API_URL}/overviews`;
        let payload: any;
        if (USE_MOCKS) {
          const res = await fetch(`/mocks/overviews.${currClient}.json`, { cache: "no-store" });
          if (!res.ok) throw new Error(`mock not found: /mocks/overviews.${currClient}.json`);
          payload = await res.json();
          logRoute("/overviews (mock)", payload);
        } else {
          const resp = await axios.post(route, { client_id: currClient });
          payload = resp.data;
          logRoute("/overviews", payload);
        }
        const rows: OverviewRow[] = Array.isArray(payload) ? payload : payload?.overview_data ?? [];
        if (!rows.length) throw new Error("No overview data");
        setOverviews(rows);
        setStatus("ready");
        console.log(...pill("network", "#475569"), USE_MOCKS ? "mock" : "live");
      } catch (err: any) {
        setErrorMsg(err?.response?.data?.message || err.message || "Unknown error");
        setStatus("error");
      }
    })();
  }, [currClient]);

  // pick the latest month (first row of API)
  const current = overviews[0];

  // aggregate rows for KPI + chips
  const aggregatedTables = useMemo(() => {
    const acc: Record<string, any[]> = Object.fromEntries(assetKeys.map((k) => [k, []]));
    (current?.table_data?.tableData ?? []).forEach((bank: any) => {
      assetKeys.forEach((k) => {
        const alias = keyAliases[k].find((a) => bank[a] !== undefined);
        if (!alias) return;
        const assetBlock = bank[alias];
        const rows = Array.isArray(assetBlock) ? assetBlock : Array.isArray(assetBlock?.rows) ? assetBlock.rows : [];
        rows.forEach((row: any) => acc[k].push({ bank: bank.bank, ...row }));
      });
    });
    return acc;
  }, [current?.table_data]);

  const kpis = useMemo(() => {
    const rows = Object.values(aggregatedTables).flat();
    let assets = 0;
    let liabilitiesAbs = 0;
    for (const r of rows) {
      const v = Number((r as any)?.balanceUsd ?? 0);
      if (Number.isFinite(v)) {
        if (v >= 0) assets += v;
        else liabilitiesAbs += -v;
      }
    }
    const net = assets - liabilitiesAbs;
    const aumFromPie =
      (current?.pie_chart_data?.charts?.[0]?.data ?? []).reduce((a: number, b: number) => a + b, 0) || undefined;
    return { assets, liabilities: liabilitiesAbs, netAssets: net, aumFromPie };
  }, [aggregatedTables, current]);

  const bucketChips = useMemo(() => {
    return assetKeys.map((k) => {
      const rows = aggregatedTables[k] || [];
      const total = rows.reduce((a, r) => a + (Number((r as any)?.balanceUsd ?? 0) || 0), 0);
      return { key: k, label: assetLabels[k], count: rows.length, total };
    });
  }, [aggregatedTables]);

  const trend = useMemo(() => {
    if (!overviews.length) return null;
    const sorted = [...overviews].sort((a, b) => +parseDate(a.month_date) - +parseDate(b.month_date));
    const labels = sorted.map((o) =>
      new Date(o.month_date).toLocaleDateString("en-US", { year: "2-digit", month: "short" })
    );
    const data = sorted.map(
      (o) => (o.pie_chart_data?.charts?.[0]?.data ?? []).reduce((a: number, b: number) => a + b, 0) || 0
    );
    return {
      labels,
      datasets: [{ label: "Net Assets", data, fill: true, tension: 0.35, borderWidth: 2 }],
    };
  }, [overviews]);

  const lineOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: { x: { grid: { display: false } }, y: { ticks: { callback: (v: any) => fmtCurrency(Number(v)) } } },
  };

  const base = `/clients_clone/${clientId ?? ""}/assets`;

  return (
    <AssetsExportContext.Provider value={registerExporter}>
      <div className="flex flex-col overflow-auto h-[calc(100vh-64px)] gap-4 p-4">
        {/* ---- Overview (always visible on top of every assets sub-tab) ---- */}
        <div className="mt-2">
          <div className="mb-3 flex items-center justify-between">
            <div className="text-2xl font-bold">Overview</div>
            <Button
              onClick={() => exporter?.()}
              variant="outline"
              size="sm"
              disabled={!exporter}
            >
              Export PDF
            </Button>
          </div>

          {status === "loading" && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex flex-col space-y-4">
                  <Skeleton className="h-6 w-2/3 rounded" />
                  <Skeleton className="h-[250px] w-full rounded-xl" />
                </div>
              ))}
            </div>
          )}

          {status === "error" && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircleIcon className="h-5 w-5" />
              <AlertTitle>Unable to load assets</AlertTitle>
              <AlertDescription>{errorMsg}</AlertDescription>
            </Alert>
          )}

          {status === "ready" && (
            <>
              {/* KPI cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                <Kpi title="Total Assets" value={fmtCurrency(kpis.assets)} caption="Gross long positions" />
                <Kpi title="Total Liabilities" value={fmtCurrency(kpis.liabilities)} caption="Loans & short values" />
                <Kpi title="Net Assets" value={fmtCurrency(kpis.netAssets)} caption="Assets − Liabilities" />
                <Kpi
                  title="AUM (from banks)"
                  value={kpis.aumFromPie ? fmtCurrency(kpis.aumFromPie) : "—"}
                  caption="Sum of bank exposure"
                />
              </div>

              {/* Trend + quick breakdown chips */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <Card className="lg:col-span-2">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">Portfolio Trend</CardTitle>
                    <CardDescription>Net assets over reporting periods</CardDescription>
                  </CardHeader>
                  <CardContent className="h-[260px]">
                    {trend ? (
                      <Line data={trend} options={lineOptions} />
                    ) : (
                      <div className="text-sm text-muted-foreground">No history</div>
                    )}
                  </CardContent>
                </Card>

                <Card className={MOCK_UI(USE_MOCKS)}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">Breakdown (quick view)</CardTitle>
                    <CardDescription>By asset bucket</CardDescription>
                  </CardHeader>
                  <CardContent className="flex flex-wrap gap-2">
                    {bucketChips.map((b) => (
                      <span
                        key={b.key}
                        className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs bg-muted/40"
                        title={`${b.label} • ${b.count} positions`}
                      >
                        <span className="font-medium">{b.label}</span>
                        <span className="text-muted-foreground">({b.count})</span>
                        <span className="ml-1 font-semibold">{fmtCurrency(b.total)}</span>
                      </span>
                    ))}
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </div>

        {/* ---- Sub-tab ribbon (matches top ribbon styling) ---- */}
        <div className="grid w-full grid-cols-1 sm:grid-cols-6 rounded-lg border bg-muted/40">
          {TABS.map((t) => {
            const href = `${base}/${t.slug}`;
            const active = pathname?.startsWith(href);
            return (
              <Link
                key={t.slug}
                href={href}
                className={[
                  "text-center m-1 rounded-md py-2 text-sm transition",
                  active ? "bg-background shadow-sm font-medium" : "text-muted-foreground hover:text-foreground",
                ].join(" ")}
              >
                {t.label}
              </Link>
            );
          })}
        </div>

        {/* ---- Page content for each sub-tab ---- */}
        <div>{children}</div>
      </div>
    </AssetsExportContext.Provider>
  );
}
