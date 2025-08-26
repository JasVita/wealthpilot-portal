"use client";

import { useMemo } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Landmark } from "lucide-react";

import {
  ChartOptions,
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title as CJTitle,
  Tooltip,
  Legend,
} from "chart.js";
import ChartDataLabels from "chartjs-plugin-datalabels";
import { Bar } from "react-chartjs-2";
import { MOCK_UI, USE_MOCKS } from "@/lib/dev-logger"; // ← mock styling helper

ChartJS.register(CategoryScale, LinearScale, BarElement, CJTitle, Tooltip, Legend);

// ---- Mock data (replace with API later) -------------------------
const ACCOUNTS = [
  { custodian: "UBS", account: "UBS SG 054600881789", cashUsd: 8_200_000 },
  { custodian: "UBS", account: "UBS HK 054600880825", cashUsd: 2_100_000 },
];

// ---- Helpers -----------------------------------------------------
const fmtUSD = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);

const fmtShortUSD = (n: number) => {
  if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return fmtUSD(n);
};

export default function CashPage() {
  const total = useMemo(() => ACCOUNTS.reduce((a, b) => a + b.cashUsd, 0), []);
  const rows = useMemo(
    () =>
      ACCOUNTS.map((r) => ({
        ...r,
        pct: total > 0 ? (r.cashUsd / total) * 100 : 0,
      })),
    [total]
  );

  // ---- Chart data ------------------------------------------------
  const barData = useMemo(
    () => ({
      labels: rows.map((r) => r.custodian),
      datasets: [
        {
          label: "Cash",
          data: rows.map((r) => r.cashUsd),
          backgroundColor: "#4F6CF0", // indigo-ish
          borderRadius: 8,
          barThickness: 56,
        },
      ],
    }),
    [rows]
  );

  const barOptions = useMemo<ChartOptions<"bar">>(
    () => ({
        responsive: true,
        maintainAspectRatio: false,
        scales: {
        x: {
            grid: { display: false },
            ticks: { font: { size: 12 } },
        },
        y: {
            grid: { color: "rgba(148,163,184,0.25)" },
            ticks: {
            callback: (v: any) => fmtShortUSD(Number(v)),
            font: { size: 12 },
            },
        },
        },
        plugins: {
        legend: { display: false },
        tooltip: {
            callbacks: {
            title: (items: any[]) => `Custodian: ${rows[items[0].dataIndex].custodian}`,
            label: (item: any) => `${rows[item.dataIndex].account} : ${fmtShortUSD(item.parsed.y)}`,
            },
        },
        datalabels: {
            anchor: "end",
            align: "end",
            offset: 4,
            formatter: (v: number) => fmtShortUSD(v),
            color: "#111827",
            font: { weight: 600, size: 11 }, // <-- number, not string
        },
        },
    }),
    [rows]
    );

  return (
    <Card className={MOCK_UI(USE_MOCKS)}>
      <CardHeader>
        <CardTitle>Cash Distribution</CardTitle>
        <CardDescription>By custodian and account</CardDescription>
      </CardHeader>

      <CardContent>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: summary + account list */}
          <div className="space-y-6">
            <div className="rounded-xl border bg-slate-50 p-4">
              <div className="text-sm text-muted-foreground">Total Cash Value</div>
              <div className="mt-1 text-2xl font-semibold">{fmtUSD(total)}</div>
            </div>

            <div>
              <div className="mb-3 text-sm font-medium text-slate-700">Accounts</div>
              <div className="space-y-3">
                {rows.map((r) => (
                  <div
                    key={r.account}
                    className="flex items-center justify-between rounded-lg border p-3 hover:bg-slate-50"
                  >
                    <div className="flex items-center gap-2">
                      <span className="inline-flex h-6 w-6 items-center justify-center rounded bg-indigo-50">
                        <Landmark className="h-4 w-4 text-indigo-600" />
                      </span>
                      <div className="text-sm text-primary hover:underline cursor-pointer">
                        {r.account}
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-sm font-semibold">{fmtShortUSD(r.cashUsd)}</div>
                      <div className="text-xs text-muted-foreground">
                        {r.pct.toFixed(2)}%
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right: bar chart */}
          <div className="h-[320px] rounded-xl border p-3">
            <Bar data={barData} options={barOptions} plugins={[ChartDataLabels]} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
