"use client";

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import {
  Chart as ChartJS,
  ArcElement,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
  Title,
} from "chart.js";
import ChartDataLabels from "chartjs-plugin-datalabels";
import { Doughnut, Bar } from "react-chartjs-2";
import { useEffect, useMemo, useState, useCallback } from "react";
import axios from "axios";
import { useRouter, useParams } from "next/navigation";
import { useClientStore } from "@/stores/clients-store";
import { MOCK_UI, USE_MOCKS } from "@/lib/dev-logger";
import { fmtCurrency, fmtCurrency2, pct } from "@/lib/format";
import { Tooltip as UITooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { CircleHelp } from "lucide-react";

/* ---------------- Chart.js setup ---------------- */
ChartJS.register(
  ArcElement,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
  Title
);

type Row = { label: string; value: number };

/* ---- Simple mocks (kept for TOP10/Geo/Industry only) ---- */
const top10Holdings: { name: string; weight: number }[] = [
  { name: "Johnson & Johnson (JNJ)", weight: 9.4 },
  { name: "NVIDIA (NVDA)", weight: 8.7 },
  { name: "Alphabet (GOOGL)", weight: 7.8 },
  { name: "Amazon (AMZN)", weight: 7.3 },
  { name: "Apple (AAPL)", weight: 6.9 },
  { name: "Microsoft (MSFT)", weight: 6.3 },
  { name: "Meta (META)", weight: 5.6 },
  { name: "Berkshire Hathaway (BRK.B)", weight: 5.1 },
  { name: "JPMorgan (JPM)", weight: 4.5 },
  { name: "Visa (V)", weight: 3.8 },
];

const geoAllocation: Row[] = [
  { label: "Singapore", value: 20663765 },
  { label: "Hong Kong", value: 15432109 },
  { label: "United States", value: 12321098 },
  { label: "European Union", value: 8765432 },
  { label: "Japan", value: 5432198 },
  { label: "Others", value: 2876443 },
];

const industryAllocation: Row[] = [
  { label: "Financial Services", value: 18596622 },
  { label: "Technology", value: 15765432 },
  { label: "Healthcare", value: 9432110 },
  { label: "Consumer Discretionary", value: 7654321 },
  { label: "Energy", value: 5432199 },
  { label: "Industrials", value: 4321988 },
  { label: "Materials", value: 3210877 },
];

const palette = [
  "#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#06B6D4",
  "#84CC16", "#F97316", "#22C55E", "#6366F1", "#14B8A6", "#A855F7",
];

export default function AnalysisPage() {
  const router = useRouter();
  const { clientId } = useParams<{ clientId: string }>();
  const { currClient } = useClientStore();

  /* ---------- Product Allocation (REAL from /overview) ---------- */
  const [paRows, setPaRows] = useState<Row[]>([]); // no fallback

  useEffect(() => {
    if (!currClient) return;
    (async () => {
      try {
        const { data } = await axios.get("/api/clients/assets/overview", {
          params: { client_id: currClient },
        });
        const charts = data?.overview_data?.[0]?.pie_chart_data?.charts ?? [];
        const ac = charts.find(
          (c: any) => String(c?.title || "").toLowerCase().includes("asset_class")
        );
        if (ac && Array.isArray(ac.labels) && Array.isArray(ac.data)) {
          const rows: Row[] = ac.labels
            .map((label: string, i: number) => ({
              label,
              value: Number(ac.data[i] ?? 0),
            }))
            // If "Loans" is negative, drop it from allocation. Keep only positives.
            .filter((r: Row) => r.value > 0);
          setPaRows(rows);
        } else {
          setPaRows([]);
        }
      } catch {
        setPaRows([]);
      }
    })();
  }, [currClient]);

  const paSorted = useMemo(() => paRows.slice().sort((a, b) => b.value - a.value), [paRows]);
  const totalProduct = useMemo(() => paRows.reduce((a, r) => a + r.value, 0), [paRows]);

  const paDoughnut = useMemo(() => {
    if (!paRows.length) return null;
    return {
      labels: paRows.map((r) => r.label),
      datasets: [
        {
          data: paRows.map((r) => r.value),
          backgroundColor: paRows.map((_, i) => palette[i % palette.length]),
          borderWidth: 0,
          cutout: "60%",
        },
      ],
    };
  }, [paRows]);

  const doughnutOptions = useMemo(
    () => ({
      responsive: true,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx: any) => {
              const value = Number(ctx.raw ?? 0);
              return ` ${fmtCurrency2(value)}  (${pct(value, totalProduct).toFixed(2)}%)`;
            },
          },
        },
        datalabels: {
          color: "#fff",
          font: { weight: "bold" as const },
          formatter: (value: number, ctx: any) => {
            const dataset = (ctx.dataset?.data || []) as number[];
            const t = dataset.reduce((a, b) => a + b, 0);
            const p = pct(value, t);
            return p >= 3 ? `${Math.round(p)}%` : "";
          },
        },
      },
    }),
    [totalProduct]
  );

  /* ---------- Currency Allocation (REAL via /cash) ---------- */
  const [ccyLabels, setCcyLabels] = useState<string[]>([]);
  const [ccyData, setCcyData]     = useState<number[]>([]);
  const ccyTotal = useMemo(() => ccyData.reduce((a, b) => a + b, 0), [ccyData]);

  const ccyRows = useMemo(
    () =>
      ccyLabels
        .map((label, i) => ({ label, value: ccyData[i] ?? 0 }))
        .sort((a, b) => b.value - a.value),
    [ccyLabels, ccyData]
  );

  useEffect(() => {
    if (!currClient) return;
    (async () => {
      try {
        const { data } = await axios.get("/api/clients/assets/cash", {
          params: { client_id: currClient },
        });
        const by = data?.cash?.by_currency;
        setCcyLabels(Array.isArray(by?.labels) ? by.labels : []);
        setCcyData(Array.isArray(by?.data) ? by.data : []);
      } catch {
        setCcyLabels([]); setCcyData([]);
      }
    })();
  }, [currClient]);

  /* ---------- TOP 10 (unchanged mock) ---------- */
  const barData = useMemo(
    () => ({
      labels: top10Holdings.map((h) => h.name),
      datasets: [
        {
          label: "Weight",
          data: top10Holdings.map((h) => h.weight),
          backgroundColor: "#3B82F6",
          borderRadius: 6,
          barThickness: 18,
        },
      ],
    }),
    []
  );

  const barOptions = useMemo(
    () => ({
      indexAxis: "y" as const,
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: { min: 0, max: 100, ticks: { callback: (v: any) => `${v}%` }, grid: { drawBorder: false } },
        y: { grid: { display: false, drawBorder: false } },
      },
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: (ctx: any) => ` ${ctx.raw}%` } },
        datalabels: {
          anchor: "end" as const,
          align: "right" as const,
          color: "#111827",
          formatter: (v: number) => `${v}%`,
        },
      },
    }),
    []
  );

  /* ---------- Shared borderless table renderer for mock cards ---------- */
  const renderAllocationTable = (title: string, rows: Row[]) => {
    const total = rows.reduce((a, r) => a + r.value, 0);
    return (
      <Card className={MOCK_UI(USE_MOCKS)}>
        <CardHeader>
          <CardTitle className="text-base">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <Table className="text-sm">
            <TableHeader>
              <TableRow>
                <TableHead className="w-2/5">Item</TableHead>
                <TableHead>Market Value</TableHead>
                <TableHead className="text-right">Weight</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r, i) => (
                <TableRow key={`${r.label}-${i}`} className="hover:bg-muted/40 border-b last:border-0">
                  <TableCell className="whitespace-nowrap">{r.label}</TableCell>
                  <TableCell className="whitespace-nowrap">{fmtCurrency(r.value)}</TableCell>
                  <TableCell className="whitespace-nowrap text-right">
                    {pct(r.value, total).toFixed(2)}%
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    );
  };

  /* ---- Only header of Currency Allocation should be clickable ---- */
  const goToCashCurrency = useCallback(() => {
    router.push(`/clients_clone/${clientId}/assets/cash?mode=currency`);
  }, [router, clientId]);

  /* ------------------------------ Render ------------------------------ */
  return (
    <div className="flex flex-col gap-6">
      {/* Product Allocation (chart + table) */}
      <Card>
        <CardHeader>
          <CardTitle>Product Allocation</CardTitle>
          <CardDescription>Distribution by asset class</CardDescription>
        </CardHeader>
        <CardContent>
          {paRows.length ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="flex items-center justify-center">
                <div className="w-[260px] h-[260px]">
                  <Doughnut
                    data={paDoughnut as any}
                    options={doughnutOptions as any}
                    plugins={[ChartDataLabels]}
                  />
                </div>
              </div>

              <div className="overflow-hidden">
                <div className="max-h-[360px] overflow-y-auto">
                  <Table className="text-sm">
                    <TableHeader className="sticky top-0 bg-background z-10">
                      <TableRow>
                        <TableHead className="w-1/2">Class</TableHead>
                        <TableHead className="w-1/4 text-right">Market Value</TableHead>
                        <TableHead className="w-1/4 text-right">Weight</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paSorted.map((r, i) => (
                        <TableRow key={`${r.label}-${i}`} className="hover:bg-muted/40 border-b last:border-0">
                          <TableCell className="whitespace-nowrap py-3">{r.label}</TableCell>
                          {/* 2 decimals exact */}
                          <TableCell className="whitespace-nowrap py-3 text-right">{fmtCurrency2(r.value)}</TableCell>
                          <TableCell className="whitespace-nowrap py-3 text-right font-semibold">
                            {pct(r.value, totalProduct).toFixed(2)}%
                          </TableCell>
                        </TableRow>
                      ))}

                      {/* Total row */}
                      <TableRow className="font-semibold">
                        <TableCell>Total</TableCell>
                        <TableCell className="text-right">{fmtCurrency2(totalProduct)}</TableCell>
                        <TableCell className="text-right">100.00%</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">No asset-class data available for this period.</div>
          )}
        </CardContent>
      </Card>

      {/* TOP 10 */}
      <Card className={MOCK_UI(USE_MOCKS)}>
        <CardHeader>
          <CardTitle>TOP 10</CardTitle>
          <CardDescription>Largest positions by portfolio weight</CardDescription>
        </CardHeader>
        <CardContent className="h-[380px]">
          <Bar
            data={{
              labels: top10Holdings.map((h) => h.name),
              datasets: [
                {
                  label: "Weight",
                  data: top10Holdings.map((h) => h.weight),
                  backgroundColor: "#3B82F6",
                  borderRadius: 6,
                  barThickness: 18,
                },
              ],
            }}
            options={barOptions as any}
          />
        </CardContent>
      </Card>

      {/* Bottom 3 cards: Currency (real), Geo (mock), Industry (mock) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Currency Allocation — real table; only header is clickable */}
        <Card className="hover:shadow-sm transition-shadow">
          <CardHeader
            role="button"
            tabIndex={0}
            onClick={goToCashCurrency}
            onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && goToCashCurrency()}
            className="cursor-pointer flex items-center justify-between"
            title="Go to Cash Distribution (Currency)"
          >
            <div className="flex items-center gap-2">
              <CardTitle className="text-base">Currency Allocation</CardTitle>
              <TooltipProvider delayDuration={150}>
                <UITooltip>
                  <TooltipTrigger asChild>
                    <button type="button" aria-label="Info" className="text-slate-400 hover:text-slate-600">
                      <CircleHelp className="h-4 w-4" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="max-w-xs">
                    All currency amounts shown here are converted to <b>USD</b> using the statement/portfolio FX.
                  </TooltipContent>
                </UITooltip>
              </TooltipProvider>
            </div>
          </CardHeader>

          <CardContent>
            <Table className="text-sm">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-2/5">Currency</TableHead>
                  <TableHead>Market Value</TableHead>
                  <TableHead className="text-right">Weight</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ccyRows.length ? (
                  <>
                    {ccyRows.map((r, i) => (
                      <TableRow key={`${r.label}-${i}`} className="hover:bg-muted/40 border-b last:border-0">
                        <TableCell className="whitespace-nowrap">{r.label}</TableCell>
                        <TableCell className="whitespace-nowrap">{fmtCurrency2(r.value)}</TableCell>
                        <TableCell className="whitespace-nowrap text-right">
                          {pct(r.value, ccyTotal).toFixed(2)}%
                        </TableCell>
                      </TableRow>
                    ))}
                    {/* Total row */}
                    <TableRow className="font-semibold">
                      <TableCell>Total</TableCell>
                      <TableCell className="whitespace-nowrap">{fmtCurrency2(ccyTotal)}</TableCell>
                      <TableCell className="whitespace-nowrap text-right">100.00%</TableCell>
                    </TableRow>
                  </>
                ) : (
                  <TableRow>
                    <TableCell colSpan={3} className="text-muted-foreground py-6">
                      No currency data available.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {renderAllocationTable("Geographic Allocation", geoAllocation)}
        {renderAllocationTable("Industry Allocation", industryAllocation)}
      </div>
    </div>
  );
}
