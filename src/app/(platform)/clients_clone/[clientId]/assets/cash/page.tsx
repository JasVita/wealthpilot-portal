"use client";

import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useClientStore } from "@/stores/clients-store";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Landmark } from "lucide-react";
import { fmtCurrency } from "@/lib/format";

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title as CJTitle,
  Tooltip as ChartTooltip,   // ⬅️ alias the chart.js Tooltip
  Legend,
  ChartOptions,
} from "chart.js";
import ChartDataLabels from "chartjs-plugin-datalabels";
import { Bar } from "react-chartjs-2";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { CircleHelp } from "lucide-react";

ChartJS.register(CategoryScale, LinearScale, BarElement, CJTitle, ChartTooltip, Legend, ChartDataLabels);

/* ----------------------------- API types ----------------------------- */
type CashApi = {
  status: "ok" | "error";
  month_date: string | null;
  totals: { grand_total: number };
  cash: {
    by_currency: { labels: string[]; data: number[]; colors: string[] };
    by_bank: { labels: string[]; data: number[]; colors: string[] };
    by_account?: { bank: string; account: string; amount: number }[];
    bank_currency: { banks: string[]; currencies: string[]; matrix: number[][] };
    by_account_currency?: {
      bank: string;
      account: string;
      items: { currency: string; amount: number }[];
    }[];
  };
};

/* --------------------------- local helpers --------------------------- */
const fmtShortUSD = (n: number) => {
  if (Math.abs(n) >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(1)}B`;
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return fmtCurrency(n, 0);
};

/* ==================================================================== */
export default function CashPage() {
  const { currClient } = useClientStore();
  const [data, setData] = useState<CashApi | null>(null);
  const [mode, setMode] = useState<"bank" | "currency" | "all">("bank");

  useEffect(() => {
    if (!currClient) return;
    (async () => {
      const { data } = await axios.get<CashApi>("/api/clients/assets/cash", {
        params: { client_id: currClient }, // latest month auto-picked by the route
      });
      setData(data);
    })();
  }, [currClient]);

  const total = data?.totals?.grand_total ?? 0;

  /* % share uses only positive cash to avoid >100% when there are overdrafts */
  const accounts = useMemo(() => {
    const list = data?.cash?.by_account ?? [];
    const posTotal = list.reduce((a, r) => a + (r.amount > 0 ? r.amount : 0), 0);
    return list.map((r) => ({
      ...r,
      pct: posTotal > 0 ? (Math.max(r.amount, 0) / posTotal) * 100 : 0,
    }));
  }, [data]);

  /* Index "bank|account" -> [{currency, amount}, ...] for quick lookup when showing chips */
  const accountCurrencyMap = useMemo(() => {
    const rows = data?.cash?.by_account_currency ?? [];
    const m = new Map<string, { currency: string; amount: number }[]>();
    for (const r of rows) m.set(`${r.bank}|${r.account}`, r.items);
    return m;
  }, [data]);

  /* ----------------------------- chart data ----------------------------- */
  const chart = useMemo(() => {
    if (!data) return null;

    if (mode === "bank") {
      const lbl = data.cash.by_bank.labels;
      const vals = data.cash.by_bank.data;
      return {
        data: {
          labels: lbl,
          datasets: [
            {
              label: "Cash",
              data: vals,
              backgroundColor: data.cash.by_bank.colors,
              borderRadius: 8,
              barThickness: 56,
            },
          ],
        },
        stacked: false,
      };
    }

    if (mode === "currency") {
      const lbl = data.cash.by_currency.labels;
      const vals = data.cash.by_currency.data;
      return {
        data: {
          labels: lbl,
          datasets: [
            {
              label: "Cash",
              data: vals,
              backgroundColor: data.cash.by_currency.colors,
              borderRadius: 8,
              barThickness: 56,
            },
          ],
        },
        stacked: false,
      };
    }

    // "all" → stacked banks × currencies
    const banks = data.cash.bank_currency.banks;
    const ccys = data.cash.bank_currency.currencies;
    const mat = data.cash.bank_currency.matrix; // [bank][ccy]
    const ds = ccys.map((ccy, j) => ({
      label: ccy,
      data: banks.map((_, i) => mat[i][j]),
      backgroundColor: data.cash.by_currency.colors[j % data.cash.by_currency.colors.length],
      borderRadius: 4,
    }));
    return {
      data: { labels: banks, datasets: ds },
      stacked: true,
    };
  }, [data, mode]);

  const options = useMemo<ChartOptions<"bar">>(() => {
    const values: number[] =
      (chart?.data as any)?.datasets?.flatMap((ds: any) =>
        Array.isArray(ds?.data) ? ds.data : []
      ) ?? [];

    const minV = values.length ? Math.min(...values) : 0;
    const maxV = values.length ? Math.max(...values) : 0;
    const pad = (maxV - minV) * 0.08 || (Math.abs(maxV) || 1) * 0.08;

    return {
      responsive: true,
      maintainAspectRatio: false,
      layout: { padding: { top: 12, right: 8, bottom: 8, left: 8 } },
      scales: {
        x: {
          stacked: chart?.stacked,
          grid: { display: false },
          ticks: { font: { size: 12 } },
        },
        y: {
          stacked: chart?.stacked,
          suggestedMin: minV - pad,
          suggestedMax: maxV + pad,
          grid: { color: "rgba(148,163,184,0.25)" },
          ticks: {
            callback: (v: any) => fmtShortUSD(Number(v)),
            font: { size: 12 },
          },
        },
      },
      plugins: {
        legend: { display: mode === "all" },
        tooltip: {
          callbacks: {
            label: (i: any) => {
              const val = Number(i.parsed.y);
              const name = i.dataset?.label ? `${i.dataset.label}: ` : "";
              return `${name}${fmtCurrency(val, 2)}`;
            },
          },
        },
        datalabels: {
          anchor: (ctx: any) => (ctx?.parsed?.y ?? 0) < 0 ? "start" : "end",
          align: (ctx: any) => (ctx?.parsed?.y ?? 0) < 0 ? "start" : "end",
          offset: 4,
          formatter: (v: number) => (v ? fmtShortUSD(v) : ""),
          color: "#111827",
          font: { weight: 600 as const, size: 11 },
          clip: false,
          display: (ctx: any) => {
            if (mode !== "all") return true;
            const v = ctx?.parsed?.y ?? 0;
            return Math.abs(v) > 0;
          },
        },
      },
    };
  }, [chart, mode]);

  /* -------------------------------- UI --------------------------------- */
  return (
    <Card>
      <CardHeader className="flex items-start justify-between gap-4">
        <div>
          <CardTitle>Cash Distribution</CardTitle>
          <CardDescription>By custodian and account</CardDescription>
        </div>

        {/* Mode switcher */}
        <Tabs value={mode} onValueChange={(v) => setMode(v as any)}>
          <TabsList>
            <TabsTrigger value="bank">Bank</TabsTrigger>
            <TabsTrigger value="currency">Currency</TabsTrigger>
            <TabsTrigger value="all">All</TabsTrigger>
          </TabsList>
        </Tabs>
      </CardHeader>

      <CardContent>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: summary + account list */}
          <div className="space-y-6">
            <div className="rounded-xl border bg-slate-50 p-4">
              <div className="text-sm text-muted-foreground">Net Cash Value</div>
              <div className="mt-1 text-2xl font-semibold">{fmtCurrency(total, 2)}</div>
            </div>

            <div>
              <div className="mb-3 flex items-center gap-2 text-sm font-medium text-slate-700">
                Accounts
                <TooltipProvider delayDuration={150}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        aria-label="Info: amounts are shown in USD"
                        className="text-slate-400 hover:text-slate-600"
                      >
                        <CircleHelp className="h-4 w-4" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="right" className="max-w-xs">
                      All currency amounts shown here are converted to <b>USD</b> using the statement/portfolio FX.
                      {/* provided by your custodian. */}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>


              <div className="space-y-3">
                {(accounts.length ? accounts : []).map((r) => {
                  const key = `${r.bank}|${r.account}`;
                  const items = accountCurrencyMap.get(key) ?? [];
                  return (
                    <div
                      key={key}
                      className="flex items-start justify-between rounded-lg border p-3"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="inline-flex h-6 w-6 items-center justify-center rounded bg-indigo-50">
                            <Landmark className="h-4 w-4 text-indigo-600" />
                          </span>
                          <div className="text-sm text-primary">
                            {r.bank} {r.account}
                          </div>
                        </div>

                        {/* In Currency mode, show currency chips with exact values (commas, 2dp) */}
                        {mode === "currency" && items.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {items.map((it) => (
                              <span
                                key={it.currency}
                                className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs"
                              >
                                <span className="text-slate-600">{it.currency}</span>
                                <span className="font-semibold">{fmtCurrency(it.amount, 2)}</span>
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="text-right ml-4">
                        <div
                          className={
                            r.amount < 0
                              ? "text-rose-600 text-sm font-semibold"
                              : "text-sm font-semibold"
                          }
                        >
                          {/* Exact number with comma separators (2dp) */}
                          {fmtCurrency(r.amount, 2)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {r.pct.toFixed(2)}%
                        </div>
                      </div>
                    </div>
                  );
                })}

                {!accounts.length && (
                  <div className="text-sm text-muted-foreground">
                    No cash accounts found for the selected period.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right: chart */}
          <div className="h-[320px] rounded-xl border p-3">
            {chart ? (
              <Bar data={chart.data as any} options={options} />
            ) : (
              <div className="text-sm text-muted-foreground p-3">Loading…</div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
