"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Pie } from "react-chartjs-2";
import { Chart as ChartJS, ArcElement, Tooltip, Legend, Title } from "chart.js";
import ChartDataLabels from "chartjs-plugin-datalabels";
import { useClientStore } from "@/stores/clients-store";
import { DataTable } from "../documents/data-table";
import axios from "axios";

ChartJS.register(ArcElement, Tooltip, Legend, Title, ChartDataLabels);

interface OverviewRow {
  month_date: string; // "2025-04-01"
  table_data: any; // PJ – not used on this page yet
  pie_chart_data: {
    charts: {
      data: number[];
      labels: string[];
      colors: string[];
      title: string;
    }[];
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

export default function Page() {
  const { currClient } = useClientStore();

  const [overviews, setOverviews] = useState<OverviewRow[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const current = useMemo(
    () => overviews.find((o) => o.month_date === selectedDate) ?? null,
    [overviews, selectedDate]
  );

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

  const aggregatedTables = useMemo(() => {
    // prepare empty buckets
    const acc: Record<string, any[]> = Object.fromEntries(assetKeys.map((k) => [k, []]));

    (current?.table_data?.tableData ?? []).forEach((bank: any) => {
      assetKeys.forEach((k) => {
        // find whichever alias exists on this bank object
        const alias = keyAliases[k].find((a) => bank[a] !== undefined);
        if (!alias) return; // nothing for this class

        const assetBlock = bank[alias];
        const rows = Array.isArray(assetBlock) // legacy shape
          ? assetBlock
          : Array.isArray(assetBlock?.rows) // new shape
          ? assetBlock.rows
          : []; // fallback – nothing

        rows.forEach((row: any) => {
          acc[k].push({ bank: bank.bank, ...row });
        });
      });
    });

    return acc;
  }, [current?.table_data]); // assetKeys is static → no need in deps

  const pieDataSets = useMemo(() => {
    if (!current) return [];
    const { charts } = current.pie_chart_data; /* or JSON.parse(current.pie_chart_data) */
    return charts.map((c) => ({
      labels: c.labels,
      datasets: [
        {
          data: c.data,
          backgroundColor: c.colors,
          borderWidth: 0,
        },
      ],
    }));
  }, [current]);

  useEffect(() => {
    if (!currClient) return;

    (async () => {
      try {
        const { data } = await axios.post<{
          status: string;
          overview_data: OverviewRow[];
          message: string;
        }>(`${process.env.NEXT_PUBLIC_API_URL}/overviews`, { client_id: currClient });
        console.log(`Recevied Data: ${JSON.stringify(data, null, 2)}`);

        if (data.status !== "ok") throw new Error(data.message || "request failed");
        const rows = data.overview_data;
        setOverviews(rows);

        /* default to newest month */
        if (rows.length) setSelectedDate(rows[0].month_date);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error("fetch overviews failed:", err);
      }
    })();
  }, [currClient]);

  const formatCurrency = (value: number): string =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);

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
        font: { weight: "bold", size: 12 },
        formatter: (value: number, ctx: any) => {
          const total = ctx.dataset.data.reduce((a: number, b: number) => a + b, 0);
          const pct = Math.round((value / total) * 100);
          return pct >= 5 ? `${pct}%` : "";
        },
      },
    },
  };

  const hasCharts = pieDataSets.length === 3;

  return (
    <div className="flex flex-col overflow-auto h-[calc(100vh-64px)] gap-4 p-4">
      {/* ── Month selector */}
      <div className="self-start mb-2">
        <Select value={selectedDate ?? undefined} onValueChange={setSelectedDate}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Select month" />
          </SelectTrigger>
          <SelectContent>
            {overviews.map((o) => (
              <SelectItem key={o.month_date} value={o.month_date}>
                {new Date(o.month_date).toLocaleDateString("en-US", { year: "numeric", month: "short" })}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {hasCharts ? (
        <>
          {/* ── Total AUM */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Total Net Worth</CardTitle>
              <CardDescription>Consolidated across all accounts</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-black">
                {formatCurrency(pieDataSets[0].datasets[0].data.reduce((a: number, b: number) => a + b, 0))}
              </div>
            </CardContent>
          </Card>

          {/* ── Three pie charts */}
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

          {/* asset tables stay unchanged (needs tableDataArray) */}
          <div className="space-y-8 mt-6">
            {assetKeys.map((k) => {
              const rows = aggregatedTables[k];
              if (rows.length === 0) return null; // skip empty classes

              /* DataTable auto-generates columns; adding `bank` field makes the
       source-bank visible without extra work. */
              return <DataTable key={k} title={assetLabels[k]} rows={rows} height={400} />;
            })}
          </div>
        </>
      ) : (
        <div className="text-muted-foreground text-center text-sm mt-10">
          No data available. Please upload documents to begin analysis.
        </div>
      )}
    </div>
  );
}
