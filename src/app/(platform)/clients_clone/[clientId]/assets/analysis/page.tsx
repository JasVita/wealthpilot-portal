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
import { useMemo } from "react";
import { MOCK_UI, USE_MOCKS } from "@/lib/dev-logger"; // ← mock styling helper

/* ---------------- Chart.js setup ---------------- */
ChartJS.register(
  ArcElement,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
  Title,
  ChartDataLabels
);

/* ---------------- Mock data ---------------- */
type Row = { label: string; value: number };

const productAllocation: Row[] = [
  { label: "Deposit", value: 19541639 },
  { label: "Fixed income", value: 19339648 },
  { label: "Equity", value: 15234567 },
  { label: "Fund", value: 8765432 },
  { label: "Structure Products", value: 6543210 },
  { label: "Hedge Fund", value: 4321098 },
  { label: "Alternative Investments", value: 3210987 },
  { label: "Forex", value: 2109876 },
  { label: "Private Equity", value: 1098765 },
  { label: "Derivative", value: 987654 },
  { label: "Cash", value: 10364579 },
  { label: "Others", value: 2799759 },
];

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

const currencyAllocation: Row[] = [
  { label: "USD", value: 23847657 },
  { label: "HKD", value: 18432567 },
  { label: "SGD", value: 12345479 },
  { label: "EUR", value: 6789012 },
  { label: "JPY", value: 3456789 },
  { label: "GBP", value: 823457 },
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

/* ---------------- Helpers ---------------- */
const fmtCurrency = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);

const pct = (part: number, total: number) => (total ? (part / total) * 100 : 0);

const palette = [
  "#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#06B6D4",
  "#84CC16", "#F97316", "#22C55E", "#6366F1", "#14B8A6", "#A855F7",
];

/* ---------------- Component ---------------- */
export default function AnalysisPage() {
  const totalProduct = useMemo(
    () => productAllocation.reduce((a, r) => a + r.value, 0),
    []
  );

  const doughnut = useMemo(() => {
    const labels = productAllocation.map((r) => r.label);
    const data = productAllocation.map((r) => r.value);

    return {
      labels,
      datasets: [
        {
          data,
          backgroundColor: labels.map((_, i) => palette[i % palette.length]),
          borderWidth: 0,
          cutout: "60%",
        },
      ],
    };
  }, []);

  const doughnutOptions = useMemo(
    () => ({
      responsive: true,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx: any) => {
              const value = ctx.raw as number;
              const p = pct(value, totalProduct);
              return ` ${fmtCurrency(value)}  (${p.toFixed(2)}%)`;
            },
          },
        },
        // Show label inside ring when slice > 5%
        datalabels: {
          color: "#fff",
          font: { weight: "bold" as const },
          formatter: (value: number, ctx: any) => {
            const dataset = ctx.dataset?.data || [];
            const t = (dataset as number[]).reduce((a, b) => a + b, 0);
            const p = pct(value, t);
            return p >= 3 ? `${Math.round(p)}%` : "";
          },
        },
      },
    }),
    [totalProduct]
  );

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
        x: {
          min: 0,
          max: 100,
          ticks: { callback: (v: any) => `${v}%` },
          grid: { drawBorder: false },
        },
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

  // Render a borderless table (keep row separators)
  const renderAllocationTable = (title: string, rows: Row[]) => {
    const total = rows.reduce((a, r) => a + r.value, 0);
    return (
      <Card className={MOCK_UI(USE_MOCKS)}>
        <CardHeader>
          <CardTitle className="text-base">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          {/* No outer border wrapper here */}
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

  const rowsSorted = useMemo(
    () => productAllocation.slice().sort((a, b) => b.value - a.value),
    []
  );

  return (
    <div className="flex flex-col gap-6">
      {/* Product Allocation (chart + table) */}
      <Card className={MOCK_UI(USE_MOCKS)}>
        <CardHeader>
          <CardTitle>Product Allocation</CardTitle>
          <CardDescription>Distribution by asset class</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="flex items-center justify-center">
              <div className="w-[260px] h-[260px]">
                <Doughnut data={doughnut} options={doughnutOptions as any} />
              </div>
            </div>

            {/* Keep the compact, scrollable table on the right */}
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
                    {rowsSorted.map((r, i) => (
                      <TableRow key={`${r.label}-${i}`} className="hover:bg-muted/40 border-b last:border-0">
                        <TableCell className="whitespace-nowrap py-3">{r.label}</TableCell>
                        <TableCell className="whitespace-nowrap py-3 text-right">{fmtCurrency(r.value)}</TableCell>
                        <TableCell className="whitespace-nowrap py-3 text-right font-semibold">
                          {pct(r.value, totalProduct).toFixed(2)}%
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* TOP 10 */}
      <Card className={MOCK_UI(USE_MOCKS)}>
        <CardHeader>
          <CardTitle>TOP 10</CardTitle>
          <CardDescription>Largest positions by portfolio weight</CardDescription>
        </CardHeader>
        <CardContent className="h-[380px]">
          <Bar data={barData} options={barOptions as any} />
        </CardContent>
      </Card>

      {/* Borderless allocation tables */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {renderAllocationTable("Currency Allocation", currencyAllocation)}
        {renderAllocationTable("Geographic Allocation", geoAllocation)}
        {renderAllocationTable("Industry Allocation", industryAllocation)}
      </div>
    </div>
  );
}
