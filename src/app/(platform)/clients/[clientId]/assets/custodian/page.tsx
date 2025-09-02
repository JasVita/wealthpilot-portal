"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import axios from "axios";
import { useClientStore } from "@/stores/clients-store";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Landmark, CircleHelp } from "lucide-react";
import { fmtCurrency, fmtShortUSD } from "@/lib/format"; 

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title as CJTitle,
  Tooltip as ChartTooltip,
  Legend,
  ChartOptions,
} from "chart.js";
import ChartDataLabels from "chartjs-plugin-datalabels";
import { Bar } from "react-chartjs-2";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

ChartJS.register(CategoryScale, LinearScale, BarElement, CJTitle, ChartTooltip, Legend, ChartDataLabels);

type CashApi = {
  status: "ok" | "error";
  month_date: string | null;
  totals: { grand_total: number };
  cash: {
    by_currency: { labels: string[]; data: number[]; colors: string[] };
    by_bank: { labels: string[]; data: number[]; colors: string[] };
    by_account?: { bank: string; account: string; amount: number }[];
    bank_currency: { banks: string[]; currencies: string[]; matrix: number[][] };
    by_account_currency?: { bank: string; account: string; items: { currency: string; amount: number }[] }[];
  };
};

/* ---------------- helpers for the Accounts panel ---------------- */
type AccRow = { bank: string; account: string; amount: number; pct?: number };
type Chip = { currency: string; amount: number };
const OVERDRAFT = (n: number) => n < 0;
const NON_TRIVIAL = (n: number, min = 1_000) => Math.abs(n) >= min;

function groupByBank(
  rows: AccRow[],
  curMap: Map<string, Chip[]>,
  minCut = 1000
) {
  const byBank = new Map<string, { total: number; items: Array<AccRow & { chips: Chip[] }> }>();
  for (const r of rows) {
    if (!NON_TRIVIAL(r.amount, minCut)) continue;
    const key = r.bank;
    const chips = (curMap.get(`${r.bank}|${r.account}`) ?? []).slice()
      .sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount));
    if (!byBank.has(key)) byBank.set(key, { total: 0, items: [] });
    const bucket = byBank.get(key)!;
    bucket.total += r.amount;
    bucket.items.push({ ...r, chips });
  }

  // sort banks by total, and accounts within banks
  const banks = Array.from(byBank.entries()).map(([bank, v]) => ({ bank, total: v.total, items: v.items }));
  banks.sort((a, b) => Math.abs(b.total) - Math.abs(a.total));
  banks.forEach((b) => b.items.sort((a, c) => Math.abs(c.amount) - Math.abs(a.amount)));
  return banks;
}

function Chips({ chips }: { chips: Chip[] }) {
  if (!chips.length) return null;
  const top = chips.slice(0, 3);
  const rest = chips.slice(3);
  return (
    <div className="mt-2 flex flex-wrap gap-1">
      {top.map((c) => (
        <span
          key={c.currency}
          className={
            "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs " +
            (c.amount < 0 ? "bg-rose-50 text-rose-700" : "bg-slate-100")
          }
          title={`${c.currency} ${fmtCurrency(c.amount, 2)}`}
        >
          <span className="text-slate-600">{c.currency}</span>
          <span className="font-semibold">{fmtCurrency(c.amount, 2)}</span>
        </span>
      ))}
      {rest.length > 0 && (
        <span className="inline-flex items-center rounded-full bg-slate-50 px-2 py-0.5 text-xs text-slate-600">
          +{rest.length} more
        </span>
      )}
    </div>
  );
}
/* ---------------------------------------------------------------- */

export default function CustodianPage() {
  const { currClient } = useClientStore();
  const searchParams = useSearchParams();

  // ✅ Default to "currency" when there is no ?mode=
  const urlMode = (searchParams?.get("mode") || "currency").toLowerCase();
  const [mode, setMode] = useState<"bank" | "currency" | "all">(
    urlMode === "bank" || urlMode === "all" ? (urlMode as any) : "currency"
  );

  // mini UI state for Accounts panel
  const [query, setQuery] = useState("");
  const [minCut, setMinCut] = useState(1000);

  // Keep respecting explicit ?mode= if present
  useEffect(() => {
    if (urlMode === "bank" || urlMode === "currency" || urlMode === "all") {
      setMode(urlMode as any);
    }
  }, [urlMode]);

  const [data, setData] = useState<CashApi | null>(null);

  useEffect(() => {
    if (!currClient) return;
    (async () => {
      const { data } = await axios.get<CashApi>("/api/clients/assets/custodian", {
        params: { client_id: currClient },
      });
      setData(data);
    })();
  }, [currClient]);

  const total = data?.totals?.grand_total ?? 0;

  const accounts = useMemo<AccRow[]>(() => {
    const list = data?.cash?.by_account ?? [];
    const posTotal = list.reduce((a, r) => a + (r.amount > 0 ? r.amount : 0), 0);
    return list.map((r) => ({ ...r, pct: posTotal > 0 ? (Math.max(r.amount, 0) / posTotal) * 100 : 0 }));
  }, [data]);

  const accountCurrencyMap = useMemo(() => {
    const rows = data?.cash?.by_account_currency ?? [];
    const m = new Map<string, Chip[]>();
    for (const r of rows) m.set(`${r.bank}|${r.account}`, r.items);
    return m;
  }, [data]);

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
              label: "Exposure",
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
              label: "Exposure",
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
    const banks = data.cash.bank_currency.banks;
    const ccys = data.cash.bank_currency.currencies;
    const mat = data.cash.bank_currency.matrix;
    const ds = ccys.map((ccy, j) => ({
      label: ccy,
      data: banks.map((_, i) => mat[i][j]),
      backgroundColor: data.cash.by_currency.colors[j % data.cash.by_currency.colors.length],
      borderRadius: 4,
    }));
    return { data: { labels: banks, datasets: ds }, stacked: true };
  }, [data, mode]);

  const options = useMemo<ChartOptions<"bar">>(() => {
    const values: number[] =
      (chart?.data as any)?.datasets?.flatMap((ds: any) => (Array.isArray(ds?.data) ? ds.data : [])) ?? [];
    const minV = values.length ? Math.min(...values) : 0;
    const maxV = values.length ? Math.max(...values) : 0;
    const pad = (maxV - minV) * 0.08 || (Math.abs(maxV) || 1) * 0.08;

    return {
      responsive: true,
      maintainAspectRatio: false,
      layout: { padding: { top: 12, right: 8, bottom: 8, left: 8 } },
      scales: {
        x: { stacked: chart?.stacked, grid: { display: false }, ticks: { font: { size: 12 } } },
        y: {
          stacked: chart?.stacked,
          suggestedMin: minV - pad,
          suggestedMax: maxV + pad,
          grid: { color: "rgba(148,163,184,0.25)" },
          ticks: { callback: (v: any) => fmtShortUSD(Number(v)), font: { size: 12 } },
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
          anchor: (ctx: any) => ((ctx?.parsed?.y ?? 0) < 0 ? "start" : "end"),
          align: (ctx: any) => ((ctx?.parsed?.y ?? 0) < 0 ? "start" : "end"),
          offset: 4,
          formatter: (v: number) => (v ? fmtShortUSD(v) : ""),
          color: "#111827",
          font: { weight: 600 as const, size: 11 },
          clip: false,
          display: (ctx: any) => (mode !== "all" ? true : Math.abs(ctx?.parsed?.y ?? 0) > 0),
        },
      },
    };
  }, [chart, mode]);

  return (
    <Card>
      <CardHeader className="flex items-start justify-between gap-4">
        <div>
          <CardTitle>Custodian Distribution</CardTitle>
          <CardDescription>By custodian and account</CardDescription>
        </div>
        <Tabs value={mode} onValueChange={(v) => setMode(v as any)}>
          <TabsList>
            <TabsTrigger value="bank">Custodian</TabsTrigger>
            <TabsTrigger value="currency">Currency</TabsTrigger>
            <TabsTrigger value="all">All</TabsTrigger>
          </TabsList>
        </Tabs>
      </CardHeader>

      <CardContent>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-6">
            <div className="rounded-xl border bg-slate-50 p-4">
              <div className="text-sm text-muted-foreground">Net Portfolio Exposure in USD</div>
              <div className="mt-1 text-2xl font-semibold">{fmtCurrency(total, 2)}</div>
            </div>

            <div>
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                  Accounts
                  <TooltipProvider delayDuration={150}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button type="button" aria-label="Info" className="text-slate-400 hover:text-slate-600">
                          <CircleHelp className="h-4 w-4" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="right" className="max-w-xs">
                        All currency amounts shown here are converted to <b>USD</b> using the statement/portfolio FX.
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>

                <div className="flex items-center gap-2">
                  <input className="h-8 w-44 rounded border px-2 text-sm" placeholder="Find account or bank…" onChange={(e) => setQuery(e.target.value)}/>
                </div>
              </div>

              {/* --- PANEL BODY --- */}
              <div className="space-y-3">
                {(() => {
                  const search = (s: string) => s.toLowerCase().includes(query.toLowerCase());
                  const base = (accounts ?? []).filter(
                    (r) => NON_TRIVIAL(r.amount, minCut) && (search(r.bank) || search(r.account))
                  );

                  if (mode === "bank" || mode === "all") {
                    const banks = groupByBank(base, accountCurrencyMap, minCut);
                    if (!banks.length)
                      return <div className="text-sm text-muted-foreground">No accounts found for the selected period.</div>;

                    const totalPos = banks.reduce((a, b) => a + (b.total > 0 ? b.total : 0), 0);

                    return banks.map((b) => (
                      <details key={b.bank} className="rounded-lg border p-3" open>
                        <summary className="flex cursor-pointer items-center justify-between">
                          <div className="font-medium">{b.bank}</div>
                          <div className={"text-right " + (OVERDRAFT(b.total) ? "text-rose-600" : "")}>
                            <div className="text-sm font-semibold">{fmtCurrency(b.total, 2)}</div>
                            <div className="text-xs text-muted-foreground">
                              {totalPos > 0 ? ((Math.max(b.total, 0) / totalPos) * 100).toFixed(2) : "0.00"}%
                            </div>
                          </div>
                        </summary>

                        {/* Bank-level currency summary chips (mirror stacked) */}
                        {mode === "all" && (
                          <Chips
                            chips={Array.from(
                              b.items.reduce((m, x) => {
                                for (const c of x.chips) m.set(c.currency, (m.get(c.currency) ?? 0) + c.amount);
                                return m;
                              }, new Map<string, number>())
                            )
                              .map(([currency, amount]) => ({ currency, amount }))
                              .sort((a, c) => Math.abs(c.amount) - Math.abs(a.amount))}
                          />
                        )}

                        <div className="mt-2 space-y-2">
                          {b.items.map((r) => (
                            <div key={r.account} className="flex items-start justify-between rounded border p-2">
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="inline-flex h-6 w-6 items-center justify-center rounded bg-indigo-50">
                                    <Landmark className="h-4 w-4 text-indigo-600" />
                                  </span>
                                  <div className="text-sm text-primary">{r.bank} {r.account}</div>
                                </div>
                                <Chips chips={r.chips} />
                              </div>
                              <div className={"text-right ml-4 " + (OVERDRAFT(r.amount) ? "text-rose-600" : "")}>
                                <div className="text-sm font-semibold">{fmtCurrency(r.amount, 2)}</div>
                                <div className="text-xs text-muted-foreground">
                                  {totalPos > 0 ? ((Math.max(r.amount, 0) / totalPos) * 100).toFixed(2) : "0.00"}%
                                  {OVERDRAFT(r.amount) && (
                                    <span className="ml-2 rounded bg-rose-50 px-1 py-0.5 text-[10px] text-rose-700">overdraft</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </details>
                    ));
                  }

                  // Currency mode – flat list with chips
                  const totalPos = base.reduce((a, r) => a + (r.amount > 0 ? r.amount : 0), 0);
                  if (!base.length)
                    return <div className="text-sm text-muted-foreground">No accounts found for the selected period.</div>;

                  return base
                    .sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount))
                    .map((r) => {
                      const chips = (accountCurrencyMap.get(`${r.bank}|${r.account}`) ?? []).slice()
                        .sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount));
                      return (
                        <div key={`${r.bank}|${r.account}`} className="flex items-start justify-between rounded-lg border p-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="inline-flex h-6 w-6 items-center justify-center rounded bg-indigo-50">
                                <Landmark className="h-4 w-4 text-indigo-600" />
                              </span>
                              <div className="text-sm text-primary">{r.bank} {r.account}</div>
                            </div>
                            <Chips chips={chips} />
                          </div>
                          <div className={"text-right ml-4 " + (OVERDRAFT(r.amount) ? "text-rose-600" : "")}>
                            <div className="text-sm font-semibold">{fmtCurrency(r.amount, 2)}</div>
                            <div className="text-xs text-muted-foreground">
                              {totalPos > 0 ? ((Math.max(r.amount, 0) / totalPos) * 100).toFixed(2) : "0.00"}%
                              {OVERDRAFT(r.amount) && (
                                <span className="ml-2 rounded bg-rose-50 px-1 py-0.5 text-[10px] text-rose-700">overdraft</span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    });
                })()}
              </div>
            </div>
          </div>

          <div className="h-[320px] rounded-xl border p-3">
            {chart ? <Bar data={chart.data as any} options={options} /> : <div className="text-sm text-muted-foreground p-3">Loading…</div>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
