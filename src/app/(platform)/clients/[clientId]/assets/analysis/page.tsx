// src/app/(platform)/clients/[clientId]/assets/analysis/page.tsx
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
import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import axios from "axios";
import { useRouter, useParams } from "next/navigation";
import { useClientStore } from "@/stores/clients-store";
import { useCustodianStore } from "@/stores/custodian-store";
import { useClientFiltersStore } from "@/stores/client-filters-store";
import { fmtCurrency, fmtCurrency2, pct } from "@/lib/format";
import { Tooltip as UITooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { CircleHelp } from "lucide-react";

/* ---------------- Chart.js setup ---------------- */
ChartJS.register(ArcElement, BarElement, CategoryScale, LinearScale, Tooltip, Legend, Title);

type Row = { label: string; value: number };

/** normalize rows[] out of a bucket that can be array | {rows:[]} | undefined */
const rowsOf = (bucket: any): any[] => {
  if (!bucket) return [];
  if (Array.isArray(bucket)) return bucket;
  if (Array.isArray(bucket.rows)) return bucket.rows;
  return [];
};

/** prefer balance_usd | balanceUsd | balance (last one may already be USD in your pipeline) */
const usdOf = (r: any): number => {
  const v = r?.balance_usd ?? r?.balanceUsd ?? r?.balance ?? 0;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

/** buckets to search for positions (exclude loans for TOP 10) */
const POS_BUCKET_KEYS = [
  "cash_and_equivalents",
  "direct_fixed_income",
  "fixed_income_funds",
  "direct_equities",
  "equity_funds",
  "equities_fund",
  "alternative_fund",
  "alternative_funds",
  "structured_products",
] as const;

/** pleasant colors for Product Allocation doughnut */
const palette = [
  "#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#06B6D4",
  "#84CC16", "#F97316", "#22C55E", "#6366F1", "#14B8A6", "#A855F7",
];

export default function AnalysisPage() {
  const router = useRouter();
  const { clientId } = useParams<{ clientId: string }>();
  const { currClient } = useClientStore();

  // Global header filters
  const { selected: selectedCustodian } = useCustodianStore();
  const { fromDate, toDate, account } = useClientFiltersStore();

  /* ---------- Product Allocation (REAL from /overview) ---------- */
  const [paRows, setPaRows] = useState<Row[]>([]);

  /* ---------- TOP 10 (REAL from /overview table_data) ---------- */
  const [top10, setTop10] = useState<{ name: string; amount: number }[]>([]);
  const [totalPos, setTotalPos] = useState<number>(0); // total positive assets (for % weights)

  /* ---------- Geo / Industry (REAL from /overview table_data) ---------- */
  const [geoRows, setGeoRows] = useState<Row[]>([]);
  const [indRows, setIndRows] = useState<Row[]>([]);

  // dedupe & cancel guards
  const lastKeyRef = useRef<string>("");
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!currClient) return;

    // Avoid transient fetch while the header is snapping the "To" date after switching custodian/account
    const waitingForTo =
      ((selectedCustodian && selectedCustodian !== "ALL") || (account && account !== "ALL")) &&
      !toDate;
    if (waitingForTo) return;

    // build params from header filters
    const params: Record<string, any> = { client_id: currClient };
    if (selectedCustodian && selectedCustodian !== "ALL") params.custodian = selectedCustodian;
    if (account && account !== "ALL") params.account = account;
    if (fromDate) params.from = fromDate;
    if (toDate)   params.to   = toDate;

    // dedupe identical requests
    const key = JSON.stringify(params);
    if (key === lastKeyRef.current) return;
    lastKeyRef.current = key;

    // cancel any in-flight
    if (abortRef.current) abortRef.current.abort();
    const ctr = new AbortController();
    abortRef.current = ctr;

    (async () => {
      try {
        const { data } = await axios.get("/api/clients/assets/overview", {
          params,
          signal: ctr.signal as any,
        });

        // ===== Product Allocation from pie_chart_data =====
        const charts = data?.overview_data?.[0]?.pie_chart_data?.charts ?? [];
        const ac = charts.find((c: any) =>
          String(c?.title || "").toLowerCase().includes("asset_class")
        );
        if (ac && Array.isArray(ac.labels) && Array.isArray(ac.data)) {
          const rows = ac.labels
            .map((label: string, i: number): Row => ({ label, value: Number(ac.data[i] ?? 0) }))
            .filter((r: Row) => r.value > 0); // drop zero/negatives (loans are negative)
          setPaRows(rows);
        } else {
          setPaRows([]);
        }

        // ===== From table_data: build TOP-10, GEO, INDUSTRY =====
        const banks = data?.overview_data?.[0]?.table_data?.tableData ?? [];
        const positions: { name: string; amount: number }[] = [];
        const geoMap = new Map<string, number>(); // country -> sum USD
        const indMap = new Map<string, number>(); // sector  -> sum USD

        for (const b of banks) {
          for (const key of POS_BUCKET_KEYS) {
            const arr = rowsOf((b as any)[key]);
            for (const r of arr) {
              const usd = usdOf(r);
              if (usd <= 0) continue;

              // TOP 10
              const name = String(r?.name ?? r?.description ?? "—");
              positions.push({ name, amount: usd });

              // GEO (country)
              const countryRaw = r?.country;
              if (countryRaw) {
                const country = String(countryRaw);
                geoMap.set(country, (geoMap.get(country) || 0) + usd);
              }

              // IND (sector)
              const sectorRaw = r?.sector;
              if (sectorRaw) {
                const sector = String(sectorRaw);
                indMap.set(sector, (indMap.get(sector) || 0) + usd);
              }
            }
          }
        }

        // totals & top10
        const total = positions.reduce((a, x) => a + x.amount, 0);
        setTotalPos(total);
        positions.sort((a, b) => b.amount - a.amount);
        setTop10(positions.slice(0, 10));

        // Geo/Industry arrays sorted desc
        const geo = Array.from(geoMap.entries())
          .map(([label, value]) => ({ label, value }))
          .sort((a, b) => b.value - a.value);
        const ind = Array.from(indMap.entries())
          .map(([label, value]) => ({ label, value }))
          .sort((a, b) => b.value - a.value);

        setGeoRows(geo);
        setIndRows(ind);
      } catch (err: any) {
        if (err?.name === "CanceledError" || err?.message === "canceled") return;
        setPaRows([]);
        setTop10([]);
        setTotalPos(0);
        setGeoRows([]);
        setIndRows([]);
      }
    })();

    return () => {
      if (abortRef.current) abortRef.current.abort();
    };
  }, [currClient, selectedCustodian, fromDate, toDate, account]);

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
  const [ccyData, setCcyData] = useState<number[]>([]);
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

    // Build params from the same header filters used across the app
    const params: Record<string, any> = { client_id: currClient, scope: "cash" };
    if (selectedCustodian && selectedCustodian !== "ALL") params.custodian = selectedCustodian;
    if (account && account !== "ALL") params.account = account;
    if (fromDate) params.from = fromDate;
    if (toDate)   params.to   = toDate;

    // cancel in-flight safely
    const ctr = new AbortController();
    let canceled = false;

    (async () => {
      try {
        const { data } = await axios.get("/api/clients/assets/cash", {
          params,
          signal: ctr.signal as any,
        });

        const by = data?.cash?.by_currency;
        if (!canceled) {
          setCcyLabels(Array.isArray(by?.labels) ? by.labels : []);
          setCcyData(Array.isArray(by?.data) ? by.data : []);
        }
      } catch (e) {
        if (!canceled) {
          setCcyLabels([]);
          setCcyData([]);
        }
      }
    })();

    return () => {
      canceled = true;
      try { ctr.abort(); } catch {}
    };
    // Make the currency card react to the same filters as Overview
  }, [currClient, selectedCustodian, account, fromDate, toDate]);

  /* ---------- TOP 10 chart (weights vs. total positive assets) ---------- */
  const top10Labels = useMemo(() => top10.map((p) => p.name), [top10]);
  const top10Weights = useMemo(
    () => top10.map((p) => (totalPos > 0 ? (p.amount / totalPos) * 100 : 0)),
    [top10, totalPos]
  );

  const top10BarData = useMemo(
    () => ({
      labels: top10Labels,
      datasets: [
        {
          label: "Weight",
          data: top10Weights,
          backgroundColor: "#3B82F6",
          borderRadius: 6,
          barThickness: 18,
        },
      ],
    }),
    [top10Labels, top10Weights]
  );

  const top10BarOptions = useMemo(
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
        tooltip: {
          callbacks: {
            // show exact USD and weight on hover
            label: (ctx: any) => {
              const idx = ctx.dataIndex;
              const amt = top10[idx]?.amount ?? 0;
              const w = Number(ctx.raw ?? 0);
              return ` ${fmtCurrency2(amt)} (${w.toFixed(2)}%)`;
            },
          },
        },
        datalabels: {
          anchor: "end" as const,
          align: "right" as const,
          color: "#111827",
          formatter: (v: number) => `${v.toFixed(2)}%`,
        },
      },
    }),
    [top10]
  );

  /* ---- Only header of Currency Allocation should be clickable ---- */
  const goToCashCurrency = useCallback(() => {
    router.push(`/clients/${clientId}/assets/cash?mode=currency`);
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
                  <Doughnut data={paDoughnut as any} options={doughnutOptions as any} plugins={[ChartDataLabels]} />
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
                          {/* exact 2dp */}
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

      {/* TOP 10 — REAL from overview table_data */}
      <Card>
        <CardHeader>
          <CardTitle>TOP 10</CardTitle>
          <CardDescription>Largest positions by USD exposure</CardDescription>
        </CardHeader>
        <CardContent className="h-[380px]">
          {top10.length ? (
            <Bar data={top10BarData} options={top10BarOptions as any} plugins={[ChartDataLabels]} />
          ) : (
            <div className="text-sm text-muted-foreground p-2">No positions available.</div>
          )}
        </CardContent>
      </Card>

      {/* Bottom 3 cards: Currency (real), Geo (real), Industry (real) */}
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
                </TableRow>
              </TableHeader>
              <TableBody>
                {ccyRows.length ? (
                  <>
                    {ccyRows.map((r, i) => (
                      <TableRow key={`${r.label}-${i}`} className="hover:bg-muted/40 border-b last:border-0">
                        <TableCell className="whitespace-nowrap">{r.label}</TableCell>
                        <TableCell className="whitespace-nowrap">{fmtCurrency2(r.value)}</TableCell>
                      </TableRow>
                    ))}
                    {/* Total row */}
                    <TableRow className="font-semibold">
                      <TableCell>Total</TableCell>
                      <TableCell className="whitespace-nowrap">{fmtCurrency2(ccyTotal)}</TableCell>
                    </TableRow>
                  </>
                ) : (
                  <TableRow>
                    <TableCell colSpan={2} className="text-muted-foreground py-6">
                      No currency data available.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Geographic Allocation — real from 'country' */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <CardTitle className="text-base">Geographic Allocation</CardTitle>
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
                  <TableHead className="w-2/5">Country</TableHead>
                  <TableHead>Market Value</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {geoRows.length ? (
                  <>
                    {geoRows.map((r, i) => (
                      <TableRow key={`${r.label}-${i}`} className="hover:bg-muted/40 border-b last:border-0">
                        <TableCell className="whitespace-nowrap">{r.label}</TableCell>
                        <TableCell className="whitespace-nowrap">{fmtCurrency2(r.value)}</TableCell>
                      </TableRow>
                    ))}
                    {/* Total row */}
                    <TableRow className="font-semibold">
                      <TableCell>Total</TableCell>
                      <TableCell className="whitespace-nowrap">
                        {fmtCurrency2(geoRows.reduce((a, x) => a + x.value, 0))}
                      </TableCell>
                    </TableRow>
                  </>
                ) : (
                  <TableRow>
                    <TableCell colSpan={2} className="text-muted-foreground py-6">
                      No geographic data available.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Industry Allocation — real from 'sector' */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <CardTitle className="text-base">Industry Allocation</CardTitle>
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
                  <TableHead className="w-2/5">Industry</TableHead>
                  <TableHead>Market Value</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {indRows.length ? (
                  <>
                    {indRows.map((r, i) => (
                      <TableRow key={`${r.label}-${i}`} className="hover:bg-muted/40 border-b last:border-0">
                        <TableCell className="whitespace-nowrap">{r.label}</TableCell>
                        <TableCell className="whitespace-nowrap">{fmtCurrency2(r.value)}</TableCell>
                      </TableRow>
                    ))}
                    {/* Total row */}
                    <TableRow className="font-semibold">
                      <TableCell>Total</TableCell>
                      <TableCell className="whitespace-nowrap">
                        {fmtCurrency2(indRows.reduce((a, x) => a + x.value, 0))}
                      </TableCell>
                    </TableRow>
                  </>
                ) : (
                  <TableRow>
                    <TableCell colSpan={2} className="text-muted-foreground py-6">
                      No industry data available.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
