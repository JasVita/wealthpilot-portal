"use client";

import { useEffect, useMemo, useRef, useState, useCallback, useContext } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircleIcon, UsersRound } from "lucide-react";
import { Pie } from "react-chartjs-2";
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
import { AssetsExportContext } from "../layout"; // register export handler with layout

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

  const pieDataSets = useMemo(() => {
    if (!current) return [];
    return current.pie_chart_data.charts.map((c) => ({
      labels: c.labels,
      datasets: [{ data: c.data, backgroundColor: c.colors, borderWidth: 0 }],
    }));
  }, [current]);

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

  const tableForPdf = useCallback(
    (key: (typeof assetKeys)[number]) => {
      const columns = ["Bank", "Name", "Currency", "Units", "Balance (USD)"];
      const body = aggregatedTables[key].map((r) => [
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

  /** Export PDF (same as before) */
  const handleDownloadPdf = useCallback(async () => {
    if (!current) return;
    const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
    const pageWidth = doc.internal.pageSize.getWidth();
    let y = 40;

    doc.setFontSize(18).text("Client Assets", pageWidth / 2, y, { align: "center" });
    y += 24;
    doc
      .setFontSize(12)
      .text(
        `Reporting Month: ${new Date(current.month_date).toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
        })}`,
        pageWidth / 2,
        y,
        { align: "center" }
      );
    y += 32;

    // include the three pie charts
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

    // add all holdings tables
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

  /** Register / unregister the export handler with the layout */
  useEffect(() => {
    registerExport(() => {
      void handleDownloadPdf();
    });
    return () => registerExport(undefined);
  }, [registerExport, handleDownloadPdf]);

  const pieOptions = {
    responsive: true,
    maintainAspectRatio: true,
    plugins: {
      legend: {
        position: "top" as const,
        labels: { usePointStyle: true, padding: 8, boxWidth: 200 },
        maxWidth: 200,
        maxHeight: 25,
        minHeight: 25,
      },
      datalabels: {
        color: "#fff",
        font: { weight: "bold" as const, size: 12 },
        formatter: (value: number, ctx: any) => {
          const total = ctx.dataset.data.reduce((a: number, b: number) => a + b, 0);
          const pct = Math.round((value / total) * 100);
          return pct >= 5 ? `${pct}%` : "";
        },
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

  if (status === "loading")
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

  if (status === "error")
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertCircleIcon className="h-5 w-5" />
          <AlertTitle>Unable to load assets</AlertTitle>
          <AlertDescription>{errorMsg}</AlertDescription>
        </Alert>
      </div>
    );

  if (!overviews.length)
    return <p className="p-6 text-muted-foreground">No consolidated data found for this client yet.</p>;

  const hasCharts = pieDataSets.length === 3;

  return (
    <div className="flex flex-col gap-4">
      {/* Pie charts */}
      {hasCharts ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
                  // keep a reference for PDF export
                  // @ts-ignore
                  ref={(el) => (chartRefs.current[idx] = el)}
                  className="w-full h-full"
                  data={data}
                  options={{
                    ...pieOptions,
                    // @ts-ignore – Chart.js types
                    plugins: { ...pieOptions.plugins, title: { display: true, text: label } },
                  }}
                />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-muted-foreground text-center text-sm mt-10">
          No data available. Please upload documents.
        </div>
      )}

      {/* Holdings tables */}
      <div className="space-y-8">
        {assetKeys.map((k) =>
          aggregatedTables[k].length ? (
            <DataTable
              key={k}
              title={assetLabels[k]}
              rows={aggregatedTables[k]}
              showLivePrices={assetLabels[k] === "Direct Equities"}
            />
          ) : null
        )}
      </div>
    </div>
  );
}
