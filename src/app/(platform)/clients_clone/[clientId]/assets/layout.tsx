"use client";

import Link from "next/link";
import clsx from "clsx";
import type { PluginOptionsByType } from "chart.js";

import ChartDataLabels from "chartjs-plugin-datalabels";
import { usePathname, useParams } from "next/navigation";
import { useEffect, useMemo, useState, createContext, useCallback, useRef } from "react";
import axios from "axios";
import { useClientStore } from "@/stores/clients-store";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircleIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Line, Pie } from "react-chartjs-2";
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
  ArcElement,
} from "chart.js";
import { MOCK_UI, USE_MOCKS, logRoute, pill } from "@/lib/dev-logger";
import { fmtCurrency, fmtCurrency2 } from "@/lib/format";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ChartTitle,
  Tooltip,
  Filler,
  Legend,
  ArcElement,
  ChartDataLabels
);

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

type Cards = {
  total_assets: number;
  total_liabilities: number;
  net_assets: number;
  aum_from_banks: number;
};

type DLPie = NonNullable<PluginOptionsByType<"pie">["datalabels"]>;

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

const parseDate = (s: string) => new Date(s);

function Kpi({
  title,
  value,
  caption,
  valueClassName,
}: {
  title: string;
  value: string;
  caption?: string;
  valueClassName?: string;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm text-muted-foreground">{title}</CardTitle>
        {caption ? <CardDescription>{caption}</CardDescription> : null}
      </CardHeader>
      <CardContent>
        <div className={clsx("text-2xl md:text-3xl font-semibold tracking-tight", valueClassName)}>{value}</div>
      </CardContent>
    </Card>
  );
}

export default function AssetsLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { clientId } = useParams<{ clientId: string }>();
  const { setCurrClient, currClient } = useClientStore();

  useEffect(() => {
    if (clientId) setCurrClient(clientId);
  }, [clientId, setCurrClient]);

  const [overviews, setOverviews] = useState<OverviewRow[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "error" | "ready">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const [cards, setCards] = useState<Cards | null>(null);
  const [trendApi, setTrendApi] = useState<{ label: string; net_assets: number }[] | null>(null);
  const [breakdownApi, setBreakdownApi] = useState<Record<string, number> | null>(null);

  useEffect(() => {
    if (!currClient) return;
    (async () => {
      setStatus("loading");
      try {
        const { data } = await axios.get("/api/clients/assets/overview", {
          params: { client_id: currClient },
        });
        const rows: OverviewRow[] = Array.isArray(data?.overview_data) ? data.overview_data : [];
        setOverviews(rows);
        setCards(data?.computed?.cards ?? null);
        setTrendApi(Array.isArray(data?.computed?.trend) ? data.computed.trend : null);
        setBreakdownApi(data?.computed?.breakdown ?? null);
        if (!rows.length) throw new Error("No overview data");
        setStatus("ready");
      } catch (err: any) {
        setErrorMsg(err?.message || "Unknown error");
        setOverviews([]);
        setCards(null);
        setTrendApi(null);
        setBreakdownApi(null);
        setStatus("ready");
      }
    })();
  }, [currClient]);

  const current = overviews[0];

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

  const pieDataSets = useMemo(() => {
    if (!current?.pie_chart_data?.charts?.length) return [];
    return current.pie_chart_data.charts.map((c) => ({
      labels: c.labels,
      datasets: [{ data: c.data, backgroundColor: c.colors, borderWidth: 0 }],
    }));
  }, [current]);

  // ---- Hidden charts for PDF ----
  const chartRefs = useRef<Record<number, any>>({});

  const tableForPdf = useCallback(
    (key: (typeof assetKeys)[number]) => {
      const columns = ["Bank", "Name", "Currency", "Units", "Balance (USD)"];
      const body = (aggregatedTables[key] || []).map((r: any) => [
        r.bank,
        r.name ?? "",
        r.currency ?? "",
        r.units ?? "",
        fmtCurrency(r.balanceUsd ?? 0),
      ]);
      return { columns, body, title: assetLabels[key] };
    },
    [aggregatedTables]
  );

  const handleExportPdf = useCallback(async () => {
    const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
    const pageWidth = doc.internal.pageSize.getWidth();

    // Cover
    let y = 60;
    doc.setFontSize(20).text("Client Assets Report", pageWidth / 2, y, { align: "center" });
    y += 24;
    const monthLabel = current?.month_date
      ? new Date(current.month_date).toLocaleDateString("en-US", { year: "numeric", month: "long" })
      : "—";
    doc.setFontSize(12).text(`Reporting Month: ${monthLabel}`, pageWidth / 2, y, { align: "center" });

    if (pieDataSets.length >= 1) {
      await new Promise((r) => requestAnimationFrame(r));
      const margin = 45;
      const availW = pageWidth - margin * 2;
      const side = Math.min(availW, 240);
      for (let idx = 0; idx < Math.min(3, pieDataSets.length); idx++) {
        const chart = chartRefs.current[idx];
        const img = chart?.toBase64Image?.();
        if (!img) continue;
        const x = margin + (availW - side) / 2;
        doc.addImage(img, "PNG", x, y, side, side, undefined, "FAST");
        y += side + 20;
        if (idx === 1) {
          doc.addPage();
          y = 40;
        }
      }
    }

    for (const key of assetKeys) {
      const { columns, body, title } = tableForPdf(key);
      if (!body.length) continue;
      doc.addPage();
      autoTable(doc, {
        head: [columns],
        body,
        startY: 60,
        margin: { left: 32, right: 32 },
        styles: { fontSize: 8 },
        headStyles: { fillColor: [40, 40, 40] },
        didDrawPage: () => {
          doc.setFontSize(14).text(title, 32, 40);
        },
      });
    }

    doc.save("assets.pdf");
  }, [current, pieDataSets, tableForPdf]);

  const kpis = useMemo(() => {
    const rows = Object.values(aggregatedTables).flat();
    let assets = 0;
    let liabilitiesAbs = 0;
    for (const r of rows) {
      const v = Number((r as any)?.balanceUsd ?? 0);
      if (!Number.isFinite(v)) continue;
      if (v >= 0) assets += v;
      else liabilitiesAbs += -v;
    }
    const net = assets - liabilitiesAbs;
    const aumFromPie =
      (current?.pie_chart_data?.charts?.[0]?.data ?? []).reduce((a: number, b: number) => a + b, 0) || undefined;
    return { assets, liabilities: liabilitiesAbs, netAssets: net, aumFromPie };
  }, [aggregatedTables, current]);

  // KPI format: exact 2 decimals
  const kpiValues = useMemo(() => {
    return {
      totalAssets: fmtCurrency2(cards ? cards.total_assets : kpis.assets),
      totalLiabilities: fmtCurrency2(Math.abs(cards ? cards.total_liabilities : kpis.liabilities)),
      netAssets: fmtCurrency2(cards ? cards.net_assets : kpis.netAssets),
      aumFromBanks: fmtCurrency2(cards ? cards.aum_from_banks : (kpis.aumFromPie ?? 0)),
    };
  }, [cards, kpis]);

  const bucketChips = useMemo(() => {
    return assetKeys.map((k) => {
      const rows = aggregatedTables[k] || [];
      const total = rows.reduce((a, r) => a + (Number((r as any)?.balanceUsd ?? 0) || 0), 0);
      return { key: k, label: assetLabels[k], count: rows.length, total };
    });
  }, [aggregatedTables]);

  const trend = useMemo(() => {
    if (trendApi && trendApi.length) {
      const labels = trendApi.map((t) => t.label);
      const data = trendApi.map((t) => t.net_assets);
      return { labels, datasets: [{ label: "Net Assets", data, fill: true, tension: 0.35, borderWidth: 2 }] };
    }
    if (!overviews.length) return null;
    const sorted = [...overviews].sort((a, b) => +parseDate(a.month_date) - +parseDate(b.month_date));
    const labels = sorted.map((o) =>
      new Date(o.month_date).toLocaleDateString("en-US", { year: "2-digit", month: "short" })
    );
    const data = sorted.map(
      (o) => (o.pie_chart_data?.charts?.[0]?.data ?? []).reduce((a: number, b: number) => a + b, 0) || 0
    );
    return { labels, datasets: [{ label: "Net Assets", data, fill: true, tension: 0.35, borderWidth: 2 }] };
  }, [trendApi, overviews]);

  // Build Breakdown chips from API or fallback, then sort DESC by absolute value
  const breakdownChips = useMemo(() => {
    let items:
      | { key: string; label: string; count?: number; total: number }[]
      | undefined;

    if (breakdownApi) {
      items = Object.entries(breakdownApi).map(([label, total]) => ({
        key: label,
        label,
        total: Number(total) || 0,
      }));
    } else {
      items = assetKeys.map((k) => {
        const rows = aggregatedTables[k] || [];
        const total = rows.reduce((a, r) => a + (Number((r as any)?.balanceUsd ?? 0) || 0), 0);
        return { key: k, label: assetLabels[k], total };
      });
    }

    if (!items) return [];
    // sort by absolute value (DESC) so zeros sink to the end
    return items.sort((a, b) => Math.abs(b.total) - Math.abs(a.total));
  }, [breakdownApi, aggregatedTables]);

  const lineOptions = useMemo(() => {
    const values = (trend?.datasets?.[0]?.data as number[]) ?? [];
    const minV = values.length ? Math.min(...values) : 0;
    const maxV = values.length ? Math.max(...values) : 0;
    const pad = (maxV - minV) * 0.08 || (maxV || 1) * 0.08;

    return {
      responsive: true,
      maintainAspectRatio: false,
      layout: { padding: { left: 8, right: 8, top: 8, bottom: 8 } },
      plugins: {
        legend: { display: true },
        datalabels: {
          display: true,
          formatter: (v: number) => fmtCurrency2(Number(v)),
          anchor: "center",
          align: "right",
          offset: 10,
          color: "#111827",
          backgroundColor: "rgba(255,255,255,0.92)",
          borderColor: "#bedcb5ff",
          borderWidth: 1,
          borderRadius: 4,
          padding: { left: 6, right: 6, top: 2, bottom: 2 },
          clip: false,
        } as any,
        padding: { left: 6, right: 6, top: 2, bottom: 2 },
      },
      elements: {
        line: { tension: 0.35 },
        point: { radius: 3 },
      },
      scales: {
        x: { grid: { display: false } },
        y: {
          beginAtZero: false,
          suggestedMin: minV - pad,
          suggestedMax: maxV + pad,
          ticks: {
            padding: 10,
            callback: (v: any) => fmtCurrency2(Number(v)),
          },
        },
      },
    };
  }, [trend]);

  const base = `/clients_clone/${clientId ?? ""}/assets`;

  const pieOptions = {
    responsive: true,
    maintainAspectRatio: true,
    plugins: {
      legend: {
        position: "top" as const,
        labels: { usePointStyle: true, padding: 8, boxWidth: 10, boxHeight: 10 },
      },
      datalabels: {
        display: (ctx: any) => {
          const ds = (ctx?.chart?.data?.datasets?.[0]?.data as number[]) || [];
          const total = ds.reduce((a, b) => a + (Number(b) || 0), 0);
          return total > 0;
        },
        color: "#fff",
        font: { weight: "bold" as const, size: 12 },
        formatter: (value: number, ctx: any) => {
          const ds = (ctx?.chart?.data?.datasets?.[0]?.data as number[]) || [];
          const total = ds.reduce((a, b) => a + (Number(b) || 0), 0);
          if (!total) return "";
          const pct = Math.round((Number(value) / total) * 100);
          return pct >= 5 ? `${pct}%` : "";
        },
      } as Partial<DLPie>,
    },
  };

  const hasCharts = pieDataSets.length === 3;

  return (
    <div className="flex flex-col overflow-auto h-[calc(100vh-64px)] gap-4 p-4" data-scroll-root="assets">
      {hasCharts ? (
        <div aria-hidden className="fixed opacity-0 pointer-events-none -z-50" style={{ left: -100000, top: -100000 }}>
          {[
            { title: "Bank Exposure", desc: "Holdings across banks", label: "Bank Entities", data: pieDataSets[0] },
            { title: "Asset Breakdown", desc: "By class", label: "Asset Class", data: pieDataSets[1] },
            { title: "Currency Exposure", desc: "By currency", label: "Currency", data: pieDataSets[2] },
          ].map(({ title, desc, label, data }, idx) => (
            <Card key={idx} className="card-hover">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">{title}</CardTitle>
                <CardDescription>{desc}</CardDescription>
              </CardHeader>
              <CardContent className="pt-0 flex flex-row h-[350px]">
                <Pie
                  ref={(el) => (chartRefs.current[idx] = el)}
                  className="w-full h-full"
                  data={data}
                  options={{
                    responsive: true,
                    maintainAspectRatio: true,
                    plugins: {
                      legend: {
                        position: "top",
                        labels: { usePointStyle: true, padding: 8, boxWidth: 10, boxHeight: 10 },
                      },
                      title: { display: true, text: label },
                      datalabels: false as any,
                    },
                  }}
                  plugins={[]}
                />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-muted-foreground text-center text-sm mt-10">No data available. Please upload documents.</div>
      )}

      <div className="mt-2">
        <div className="mb-3 flex items-center justify-between">
          <div className="text-2xl font-bold">Overview</div>
          <Button onClick={handleExportPdf} variant="outline" size="sm" disabled={!current}>
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
            {/* KPIs with exact 2 decimals */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
              <Kpi title="Total Assets" value={kpiValues.totalAssets} caption="Gross long positions" />
              <Kpi
                title="Total Liabilities"
                value={kpiValues.totalLiabilities}
                caption="Loans & short values"
                valueClassName="text-red-600"
              />
              <Kpi title="Net Assets" value={kpiValues.netAssets} caption="Assets − Liabilities" />
              <Kpi title="AUM (from banks)" value={kpiValues.aumFromBanks} caption="Sum of bank exposure" />
            </div>

            {/* Trend + quick breakdown chips */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <Card className="lg:col-span-2">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Portfolio Trend</CardTitle>
                  <CardDescription>Net assets over reporting periods</CardDescription>
                </CardHeader>
                <CardContent className="h-[260px]">
                  {trend ? <Line data={trend} options={lineOptions} /> : <div className="text-sm text-muted-foreground">No history</div>}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Breakdown (quick view)</CardTitle>
                  <CardDescription>By asset bucket</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-2">
                  {breakdownChips.map((b) => {
                    const isLoan = b.label === "Loans";
                    const showTotal = isLoan ? Math.abs(Number(b.total || 0)) : Number(b.total || 0);
                    return (
                      <span
                        key={b.key}
                        className={clsx(
                          "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs",
                          isLoan ? "bg-rose-50 border-rose-200" : "bg-muted/40"
                        )}
                        title={b.label}
                      >
                        <span className={clsx("font-medium", isLoan && "text-rose-700")}>{b.label}</span>
                        <span className={clsx("ml-1 font-semibold", isLoan && "text-rose-600")}>
                          {fmtCurrency2(showTotal)}
                        </span>
                      </span>
                    );
                  })}
                </CardContent>
              </Card>
            </div>
          </>
        )}

        {status === "ready" && !overviews.length && errorMsg && (
          <Alert variant="destructive" className="mt-4">
            <AlertCircleIcon className="h-5 w-5" />
            <AlertTitle>Note</AlertTitle>
            <AlertDescription>{errorMsg}</AlertDescription>
          </Alert>
        )}
      </div>

      {/* Sticky sub-tabs */}
      <div className="sticky z-30 bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/70 border-b -mt-px" style={{ top: -16 }}>
        <div className="px-4">
          <Tabs
            value={(pathname?.split("/").at(-1) as string) ?? "holdings"}
            onValueChange={(sub) => {
              const base = `/clients_clone/${clientId ?? ""}/assets`;
              router.push(`${base}/${sub}`);
            }}
            className="w-full"
          >
            <TabsList className="grid w-full sm:w-auto sm:inline-grid grid-cols-2 sm:grid-cols-6">
              {TABS.map((t) => (
                <TabsTrigger key={t.slug} value={t.slug}>
                  {t.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>
      </div>

      <div>{children}</div>
    </div>
  );
}
