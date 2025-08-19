"use client";

import { useEffect, useMemo, useRef, useState, useCallback, useContext } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertCircleIcon, UsersRound } from "lucide-react";
import { Pie, Doughnut } from "react-chartjs-2";
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
import { DataTable } from "@/app/(platform)/clients_clone/documents/data-table";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { logRoute, USE_MOCKS, pill } from "@/lib/dev-logger";
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
const assetId = (k: (typeof assetKeys)[number]) => `asset-${k}`;

const STICKY_OFFSET_PX = 69;

const getScrollRoot = () =>
  typeof document !== "undefined"
    ? (document.querySelector('[data-scroll-root="assets"]') as HTMLElement | null)
    : null;

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

const fmtCurrency = (v: number, digits = 0) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(v);

/** map backend aliases -> canonical keys */
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

export default function HoldingsPage() {
  const { currClient } = useClientStore();
  const registerExport = useContext(AssetsExportContext);

  const [overviews, setOverviews] = useState<OverviewRow[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "error" | "ready">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const chartRefs = useRef<Record<number, ChartJS | null>>({});

  /** latest month (first row from API/mocks) */
  const current = overviews[0] ?? null;

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

  // build pie datasets defensively
  const pieDataSets = useMemo(() => {
    if (!current?.pie_chart_data?.charts) return [];

    return current.pie_chart_data.charts.map((c: any) => {
      const data: number[] = Array.isArray(c?.data) ? c.data : [];
      const colors: string[] = Array.isArray(c?.colors) ? c.colors : [];
      // ensure labels exist and match data length
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
    if (!currClient) return;
    (async () => {
      setStatus("loading");
      try {
        const route = `${process.env.NEXT_PUBLIC_API_URL}/overviews`;
        let rows: OverviewRow[] = [];

        if (USE_MOCKS) {
          // Try mock; if missing, don't throw—just fall through to empty/live
          try {
            const res = await fetch(`/mocks/overviews.${currClient}.json`, { cache: "no-store" });
            if (res.ok) {
              const payload = await res.json();
              logRoute("/overviews (mock)", payload);
              rows = Array.isArray(payload) ? payload : payload?.overview_data ?? [];
            } else {
              console.info(`[assets] mock not found for client ${currClient}, showing empty state.`);
            }
          } catch {
            console.info(`[assets] mock fetch failed for client ${currClient}, showing empty state.`);
          }
        } else {
          // Live
          try {
            const resp = await axios.post(route, { client_id: currClient });
            const payload = resp.data;
            logRoute("/overviews", payload);
            rows = Array.isArray(payload) ? payload : payload?.overview_data ?? [];
          } catch (e: any) {
            console.warn("[assets] live fetch failed; showing empty state", e?.message || e);
          }
        }

        setOverviews(rows || []);
        setStatus("ready");
        console.log(...pill("network", "#475569"), USE_MOCKS ? "mock" : "live");
      } catch (err: any) {
        // Only use "error" for truly unexpected conditions
        setErrorMsg(err?.message || "Unknown error");
        setOverviews([]);
        setStatus("ready"); // still render, will show 'no data' state
      }
    })();
  }, [currClient]);

  const tableForPdf = useCallback(
    (key: (typeof assetKeys)[number]) => {
      const columns = ["Bank", "Name", "Currency", "Units", "Balance (USD)"];
      const body = (aggregatedTables[key] ?? []).map((r) => [
        (r as any).bank,
        (r as any).name ?? "",
        (r as any).currency ?? "",
        (r as any).units ?? "",
        fmtCurrency((r as any).balanceUsd ?? 0),
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
      `Reporting Month: ${new Date(current.month_date).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
      })}`,
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

  // refs to each section wrapper
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [activeAssetTab, setActiveAssetTab] = useState<string>(assetKeys[0]);

  // Which tabs to show (only sections that have rows)
  const visibleAssetKeys = useMemo(
    () => assetKeys.filter((k) => (aggregatedTables[k] ?? []).length > 0),
    [aggregatedTables]
  );

  const handleAssetTabClick = useCallback((key: (typeof assetKeys)[number]) => {
    const el = sectionRefs.current[assetId(key)];
    const root = getScrollRoot();
    if (!el || !root) return;

    const rootRect = root.getBoundingClientRect();
    const elRect = el.getBoundingClientRect();
    // position of section relative to the scroll root
    const relativeTop = elRect.top - rootRect.top;

    const targetY = root.scrollTop + relativeTop - STICKY_OFFSET_PX;
    root.scrollTo({ top: targetY, behavior: "smooth" });

    // (optional) set immediately so the trigger highlights right away
    setActiveAssetTab(key);
  }, []);

  // Observe which section is in view to update the active tab
  useEffect(() => {
    if (!visibleAssetKeys.length) return;
    const root = getScrollRoot();
    if (!root) return;

    const obs = new IntersectionObserver(
      (entries) => {
        const inView = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];

        if (inView?.target?.id) {
          const id = inView.target.id;
          const key = id.replace("asset-", "") as (typeof assetKeys)[number];
          if (key && key !== activeAssetTab) setActiveAssetTab(key);
        }
      },
      {
        root,
        // Trigger when a section head is near the top of the scroll root
        rootMargin: `-${STICKY_OFFSET_PX + 8}px 0px -60% 0px`,
        threshold: [0, 0.25, 0.5, 1],
      }
    );

    visibleAssetKeys.forEach((k) => {
      const el = sectionRefs.current[assetId(k)];
      if (el) obs.observe(el);
    });

    return () => obs.disconnect();
  }, [visibleAssetKeys, activeAssetTab]);

  const pieOptions = {
    responsive: true,
    maintainAspectRatio: true,
    plugins: {
      legend: {
        // position: "top" as const,
        // labels: { usePointStyle: true, padding: 8, boxWidth: 200 },
        // maxWidth: 200,
        // maxHeight: 25,
        // minHeight: 25,
        display: false,
      },
      datalabels: {
        color: "#fff",
        font: { weight: "bold" as const },
        formatter: (value: number, ctx: any) => {
          const total = ctx.dataset.data.reduce((a: number, b: number) => a + b, 0);
          const pct = Math.round((value / total) * 100);
          return pct >= 5 ? `${pct}%` : "";
        },
        // formatter: (value: number, ctx: any) => {
        //   const dataset = ctx.dataset?.data || [];
        //   const t = (dataset as number[]).reduce((a, b) => a + b, 0);
        //   const p = pct(value, t);
        //   return p >= 3 ? `${Math.round(p)}%` : "";
        // },
      },
    },
  };

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

  // We purposely don't show an error block for "no data"
  if (!overviews.length) {
    return <p className="p-6 text-muted-foreground">No consolidated data found for this client yet.</p>;
  }

  const pieCards = [
    { title: "Bank Exposure", description: "Holdings across different banks" }, // pieDataSets[0]
    { title: "Asset Breakdown", description: "Allocation by asset class" }, // pieDataSets[1]
    { title: "Currency Exposure", description: "Exposure by currency" }, // pieDataSets[2]
  ];

  return (
    <div className="flex flex-col gap-4">
      {pieCards.map((meta, idx) => {
        const ds = pieDataSets[idx];
        if (!ds) return null;

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
                    <Doughnut data={ds} options={pieOptions as any} />
                  </div>
                </div>

                {/* Compact, scrollable table */}
                <div className="overflow-hidden">
                  <div className="max-h-[360px] overflow-y-auto">
                    <Table className="text-sm">
                      <TableHeader className="sticky top-0 bg-background z-10">
                        <TableRow>
                          <TableHead className="w-1/2">
                            {meta.title === "Bank Exposure"
                              ? "Bank"
                              : meta.title === "Asset Breakdown"
                              ? "Asset"
                              : "Currency"}
                          </TableHead>
                          <TableHead className="w-1/4 text-right">Value</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {ds.labels.map((label: string, i: number) => (
                          <TableRow
                            key={`${meta.title}-${label}-${i}`}
                            className="hover:bg-muted/40 border-b last:border-0"
                          >
                            <TableCell className="whitespace-nowrap py-3">{label}</TableCell>
                            <TableCell className="whitespace-nowrap py-3 text-right">
                              {fmtCurrency(ds.datasets[0].data[i] as number)}
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
        );
      })}

      {visibleAssetKeys.length > 0 && (
        <div className="sticky z-20 bg-white border-b" style={{ top: STICKY_OFFSET_PX - 48 }}>
          <div className="px-4">
            <Tabs
              value={activeAssetTab}
              onValueChange={(v) => handleAssetTabClick(v as (typeof assetKeys)[number])}
              className="w-full"
            >
              {/* Left-aligned, increased spacing, wraps on small screens */}
              <TabsList className="flex flex-wrap justify-start gap-2 sm:gap-3 p-0">
                {visibleAssetKeys.map((k) => (
                  <TabsTrigger key={k} value={k} className="font-normal px-3 py-1.5">
                    {assetLabels[k]}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>
        </div>
      )}

      <div className="space-y-8">
        {assetKeys.map((k) => {
          const rows = aggregatedTables[k] ?? [];
          if (!rows.length) return null;

          return (
            <section
              key={k}
              id={assetId(k)}
              ref={(el) => {
                sectionRefs.current[assetId(k)] = el as HTMLDivElement | null;
              }}
              className="scroll-mt-32"
            >
              <DataTable title={assetLabels[k]} rows={rows} showLivePrices={assetLabels[k] === "Direct Equities"} />
            </section>
          );
        })}
      </div>
    </div>
  );
}
