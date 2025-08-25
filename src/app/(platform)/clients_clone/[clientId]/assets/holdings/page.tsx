"use client";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useCallback, useContext } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UsersRound } from "lucide-react";
import { Doughnut } from "react-chartjs-2";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  Title,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
} from "chart.js";
import ChartDataLabels from "chartjs-plugin-datalabels";
import axios from "axios";
import { useClientStore } from "@/stores/clients-store";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { logRoute, pill } from "@/lib/dev-logger";
import { AssetsExportContext } from "../layout";

ChartJS.register(
  ArcElement,
  Tooltip,
  Legend,
  Title,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
  ChartDataLabels
);

interface OverviewRow {
  month_date: string;
  table_data: any;
  pie_chart_data: {
    charts: { data: number[]; labels: string[]; colors: string[]; title: string }[];
  };
}

const assetKeys = ["cash_and_equivalents", "direct_fixed_income", "fixed_income_funds", "direct_equities", "equities_fund", "alternative_fund", "structured_products", "loans"] as const;
type AssetKey = (typeof assetKeys)[number];

const assetLabels: Record<AssetKey, string> = {
  cash_and_equivalents: "Cash & Equivalents",
  direct_fixed_income: "Direct Fixed Income",
  fixed_income_funds: "Fixed Income Funds",
  direct_equities: "Direct Equities",
  equities_fund: "Equity Funds",
  alternative_fund: "Alternative Funds",
  structured_products: "Structured Products",
  loans: "Loans",
};

const fmtCurrency = (v: number, digits = 0) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(v);

const pct = (value: number, total: number, digits = 0) => total > 0 ? `${((value / total) * 100).toFixed(digits)}%` : "0%";
const HOLDINGS_CACHE = new Map<string, OverviewRow[]>();
const INFLIGHT_HOLDINGS = new Set<string>();

/** map backend aliases -> canonical keys */
const keyAliases: Record<AssetKey, string[]> = {
  cash_and_equivalents: ["cashAndEquiv", "cash_and_equivalents", "cashAndEquivalents"],
  direct_fixed_income: ["directFixedIncome", "direct_fixed_income"],
  fixed_income_funds: ["fixedIncomeFunds", "fixed_income_funds"],
  direct_equities: ["directEquities", "direct_equities"],
  equities_fund: ["equityFunds", "equities_fund", "equity_funds"],
  alternative_fund: ["alternativeFunds", "alternative_fund", "alternative_funds"],
  structured_products: ["structuredProducts", "structured_products"],
  loans: ["loans"],
};

export default function HoldingsPage() {
  const { currClient } = useClientStore();
  const { clientId: routeClientId } = useParams<{ clientId: string }>();

  // Use store id if present; otherwise fall back to the route param during the first render
  const effectiveClientId = (currClient ?? routeClientId ?? "").toString();
  const registerExport = useContext(AssetsExportContext);

  const [overviews, setOverviews] = useState<OverviewRow[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "error" | "ready">("idle");
  const chartRefs = useRef<Record<number, ChartJS | null>>({});
  const SHOW_PIES = false;

  /** latest month (first row from API/mocks) */
  const current = overviews[0] ?? null;

  const aggregatedTables = useMemo(() => {
    const acc: Record<AssetKey, any[]> = Object.fromEntries(assetKeys.map((k) => [k, []])) as any;
    const banks: any[] = (current?.table_data?.tableData ?? (current as any)?.tableData ?? []);
    banks.forEach((bank: any) => {
      assetKeys.forEach((k) => {
        const alias = keyAliases[k].find((a) => bank[a] !== undefined);
        if (!alias) return;
        const block = bank[alias];
        const rows = Array.isArray(block) ? block : Array.isArray(block?.rows) ? block.rows : [];
        rows.forEach((row: any) => acc[k].push({ bank: bank.bank, ...row }));
      });
    });
    return acc;
  }, [current]);

  // build pie datasets defensively
  const pieDataSets = useMemo(() => {
    if (!current?.pie_chart_data?.charts) return [];
    return current.pie_chart_data.charts.map((c: any) => {
      const data: number[] = Array.isArray(c?.data) ? c.data : [];
      const colors: string[] = Array.isArray(c?.colors) ? c.colors : [];
      const labels: string[] =
        Array.isArray(c?.labels) && c.labels.length === data.length ? c.labels : data.map((_, i) => `Item ${i + 1}`);
      return {
        labels,
        datasets: [
          {
            data,
            backgroundColor: colors.length === data.length ? colors : undefined,
            borderWidth: 0,
          },
        ],
      };
    });
  }, [current?.pie_chart_data]);

  useEffect(() => {
    if (!effectiveClientId) return;
    const key = effectiveClientId;

    // 1) hydrate instantly from cache (prevents "No client selected" flicker)
    const cached = HOLDINGS_CACHE.get(key);
    if (cached) {
      setOverviews(cached);
      setStatus("ready");
    } else {
      setOverviews([]);     // clear previous client's rows
      setStatus("loading"); // show loader immediately for new client
    }

    // 2) dedupe in-flight work per client
    if (INFLIGHT_HOLDINGS.has(key)) return;
    INFLIGHT_HOLDINGS.add(key);

    // 3) fetch with abort/cleanup so the inflight flag is never left set
    const controller = new AbortController();
    let alive = true;

    (async () => {
      try {
        const { data } = await axios.post(
          "/api/clients/assets/holdings",
          { client_id: key },
          { signal: controller.signal as any } // axios v1 supports AbortController
        );
        if (!alive) return;
        logRoute("/overviews", data);
        const rows: OverviewRow[] = Array.isArray(data) ? data : data?.overview_data ?? [];
        HOLDINGS_CACHE.set(key, rows || []);
        setOverviews(rows || []);
      } catch (err: any) {
        // ignore abort errors; show empty only if we had no cache
        if (!alive) return;
        if (!cached) setOverviews([]);
      } finally {
        // ALWAYS clear inflight, even if unmounted
        INFLIGHT_HOLDINGS.delete(key);
        if (alive) setStatus("ready");
        console.log(...pill("network", "#475569"), "live");
      }
    })();

    return () => {
      alive = false;
      try { controller.abort(); } catch {}
      // safety: ensure flag is cleared if we unmount while request is running
      INFLIGHT_HOLDINGS.delete(key);
    };
  }, [effectiveClientId]);


  // PDF helpers (unchanged)
  const tableForPdf = useCallback(
    (key: AssetKey) => {
      const columns = ["Bank", "Name", "Currency", "Units", "Balance (USD)"];
      const body = (aggregatedTables[key] ?? []).map((r) => [
        (r as any).bank,
        (r as any).name ?? "",
        (r as any).currency ?? "",
        (r as any).units ?? "",
        fmtCurrency((r as any).balanceUsd ?? (r as any).balance ?? 0),
      ]);
      return { columns, body, title: assetLabels[key] };
    },
    [aggregatedTables]
  );

  const handleDownloadPdf = useCallback(async () => {
    if (!current) return;
    const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
    const pageWidth = doc.internal.pageSize.getWidth();
    let y = 40;

    doc.setFontSize(18).text("Client Assets", pageWidth / 2, y, { align: "center" });
    y += 24;
    doc.setFontSize(12).text(
      `Reporting Month: ${new Date(current.month_date).toLocaleDateString("en-US", { year: "numeric", month: "long" })}`,
      pageWidth / 2,
      y,
      { align: "center" }
    );
    y += 32;

    await Promise.all(
      [0, 1, 2].map(async (idx) => {
        const chart = chartRefs.current[idx];
        // @ts-ignore
        const img = chart?.toBase64Image?.() || "";
        if (!img) return;
        doc.addImage(img, "PNG", 45, y, pageWidth - 90, 180, undefined, "FAST");
        y += 200;
        if (idx === 1) {
          doc.addPage();
          y = 40;
        }
      })
    );

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
  }, [current, tableForPdf]);

  useEffect(() => {
    registerExport(() => {
      void handleDownloadPdf();
    });
    return () => registerExport(undefined);
  }, [registerExport, handleDownloadPdf]);

  // ---- Tabs (same look as other pages) ----
  const visibleAssetKeys: AssetKey[] = useMemo(
    () => assetKeys.filter((k) => (aggregatedTables[k] ?? []).length > 0),
    [aggregatedTables]
  );
  const [activeAssetTab, setActiveAssetTab] = useState<AssetKey>("cash_and_equivalents");

  useEffect(() => {
    if (visibleAssetKeys.length === 0) return;
    if (!visibleAssetKeys.includes(activeAssetTab)) setActiveAssetTab(visibleAssetKeys[0]);
  }, [visibleAssetKeys, activeAssetTab]);

  const selectedRows = useMemo(
    () => (visibleAssetKeys.length ? aggregatedTables[activeAssetTab] ?? [] : []),
    [aggregatedTables, activeAssetTab, visibleAssetKeys]
  );

  const hasHoldings = visibleAssetKeys.length > 0;

  // If no holdings, show a clean message (no sticky bar)
  if (status === "ready" && !hasHoldings) {
    return <div className="p-6 text-muted-foreground">No holdings for this client.</div>;
  }


  // ------------------------------- UI -------------------------------

  if (status === "idle") {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-4 p-6 text-center">
        <UsersRound className="h-10 w-10 text-muted-foreground" />
        <h3 className="text-lg font-semibold">No client selected</h3>
        <p className="max-w-md text-sm text-muted-foreground">
          Choose an existing client from the sidebar — or create a new one to start uploading statements and generating
          portfolio overviews.
        </p>
      </div>
    );
  }

  if (status === "loading") {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex flex-col space-y-4">
            <Skeleton className="h-6 w-2/3 rounded" />
            <Skeleton className="h-[250px] w-full rounded-xl" />
          </div>
        ))}
      </div>
    );
  }

  if (!overviews.length) {
    return <p className="p-6 text-muted-foreground">No consolidated data found for this client yet.</p>;
  }

  const pieCards = [
    { title: "Bank Exposure", description: "Holdings across different banks" },
    { title: "Asset Breakdown", description: "Allocation by asset class" },
    { title: "Currency Exposure", description: "Exposure by currency" },
  ];

  return (
    <div className="flex flex-col gap-4">
      {/* Pies */}
      {SHOW_PIES && pieCards.map((meta, idx) => {
        const ds = pieDataSets[idx];
        if (!ds) return null;

        const total = (ds.datasets?.[0]?.data as number[] | undefined)?.reduce((a, b) => a + b, 0) ?? 0;
        const showPct = meta.title === "Asset Breakdown" || meta.title === "Currency Exposure";

        return (
          <Card key={meta.title}>
            <CardHeader>
              <CardTitle>{meta.title}</CardTitle>
              <CardDescription>{meta.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="flex items-center justify-center">
                  <div className="w-[260px] h-[260px]">
                    <Doughnut
                      data={ds}
                      options={{
                        responsive: true,
                        maintainAspectRatio: true,
                        plugins: {
                          legend: { display: false },
                          datalabels: {
                            color: "#fff",
                            font: { weight: "bold" },
                            formatter: (value: number, ctx: any) => {
                              const t = ctx.dataset.data.reduce((x: number, y: number) => x + y, 0);
                              const p = Math.round((value / t) * 100);
                              return p >= 5 ? `${p}%` : "";
                            },
                          },
                        },
                      } as any}
                    />
                  </div>
                </div>

                <div className="overflow-hidden">
                  <div className="rounded-xl border bg-card">
                    <Table className="text-sm">
                      <TableHeader className="sticky top-0 bg-muted/50 backdrop-blur z-10">
                        <TableRow className="hover:bg-transparent">
                          <TableHead className="w-1/2 uppercase tracking-wide text-[11px] text-muted-foreground">
                            {meta.title === "Bank Exposure"
                              ? "Bank"
                              : meta.title === "Asset Breakdown"
                                ? "Asset"
                                : "Currency"}
                          </TableHead>
                          <TableHead className="w-1/4 text-right uppercase tracking-wide text-[11px] text-muted-foreground">
                            {showPct ? "Weight" : "Value"}
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {ds.labels.map((label: string, i: number) => {
                          const raw = (ds.datasets[0].data[i] as number) ?? 0;
                          const val = showPct ? pct(raw, total, 0) : fmtCurrency(raw);
                          return (
                            <TableRow
                              key={`${meta.title}-${label}-${i}`}
                              className="hover:bg-muted/40 border-b last:border-0"
                            >
                              <TableCell className="whitespace-nowrap py-3">{label}</TableCell>
                              <TableCell className="whitespace-nowrap py-3 text-right">{val}</TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      }

      )}

      {/* Sticky tabs — only when we actually have holdings */}
      {hasHoldings && (
        <div
          className="sticky z-30 bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/70 border-b -mt-px"
          style={{ top: -16 }}
        >
          <div className="px-4">
            <Tabs value={activeAssetTab} onValueChange={(v) => setActiveAssetTab(v as AssetKey)} className="w-full">
              {/* xl: 8 in one row; md–xl: 4+4; <md: 2 per row */}
              <TabsList className="grid w-full gap-2 grid-cols-2 md:grid-cols-4 xl:grid-cols-8">
                {visibleAssetKeys.map((k) => (
                  <TabsTrigger
                    key={k}
                    value={k}
                    title={assetLabels[k]}
                    className="min-w-0 truncate text-xs md:text-sm px-3 py-2"
                  >
                    {assetLabels[k]}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>
        </div>
      )}

      {/* Asset table — only when we actually have holdings */}
      {hasHoldings && (
        <div className="px-4">
          {selectedRows.length ? (
            <div className="rounded-md border overflow-hidden">
              <Table className="text-sm">
                <TableHeader className="bg-background">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="min-w-[120px]">Bank</TableHead>
                    <TableHead className="min-w-[220px]">Name</TableHead>
                    <TableHead className="min-w-[100px]">Currency</TableHead>
                    <TableHead className="min-w-[100px]">Units</TableHead>
                    <TableHead className="min-w-[160px] text-right">Balance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedRows.map((r: any, i: number) => {
                    const units =
                      typeof r?.units === "number"
                        ? r.units.toLocaleString("en-US", { maximumFractionDigits: 4 })
                        : (r?.units ?? "—");

                    const balance =
                      typeof r?.balanceUsd === "number"
                        ? new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(r.balanceUsd)
                        : typeof r?.balance === "number"
                          ? new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(r.balance)
                          : typeof r?.balance_in_currency === "number"
                            ? `${r?.currency ?? ""} ${r.balance_in_currency.toLocaleString("en-US", { maximumFractionDigits: 2 })}`
                            : "—";

                    return (
                      <TableRow key={`asset-row-${i}`} className="hover:bg-muted/40 border-b last:border-0">
                        <TableCell className="py-3">{r?.bank ?? "—"}</TableCell>
                        <TableCell className="py-3">{r?.name ?? "—"}</TableCell>
                        <TableCell className="py-3">{r?.currency ?? "—"}</TableCell>
                        <TableCell className="py-3">{units}</TableCell>
                        <TableCell className="py-3 text-right">{balance}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground py-8">
              No rows for {assetLabels[activeAssetTab]}.
            </div>
          )}
        </div>
      )}

    </div>
  );
}
