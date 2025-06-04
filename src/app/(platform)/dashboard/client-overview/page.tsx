"use client";
import { useWealthStore } from "@/stores/wealth-store";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Pie } from "react-chartjs-2";
import { Chart as ChartJS, ArcElement, Tooltip, Legend, Title } from "chart.js";
import ChartDataLabels from "chartjs-plugin-datalabels";
import { useEffect } from "react";

ChartJS.register(ArcElement, Tooltip, Legend, Title, ChartDataLabels);

export default function Page() {
  const { pieDataSets, tableDataArray, setCurrClient } = useWealthStore();

  useEffect(() => {
    setCurrClient("Mock Client");
  }, []);

  const hasData = pieDataSets.length > 0 && tableDataArray.length > 0;

  const formatCurrency = (value: number): string =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);

  const safeFormatCurrency = (value?: number | null) => (value != null ? formatCurrency(value) : "-");
  const safeNumber = (value?: number | null) => (value != null ? value.toLocaleString() : "-");

  const pieOptions = {
    responsive: true,
    maintainAspectRatio: true,
    plugins: {
      legend: {
        position: "top",
        labels: {
          usePointStyle: true,
          padding: 8,
          boxWidth: 200,
        },
        maxWidth: 200,
        maxHeight: 25,
        minHeight: 25,
      },
      datalabels: {
        color: "#fff",
        font: { weight: "bold", size: 12 },
        textAlign: "center",
        display: "auto",
        formatter: (value: number, context: any) => {
          const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
          const pct = Math.round((value / total) * 100);
          return pct >= 5 ? `${pct}%` : "";
        },
      },
    },
    layout: {
      padding: {
        // top: 100,
        // right: 100,
        // bottom: 16,
        // left: 16,
      },
    },
  };

  const assetConfig = [
    {
      key: "cash_and_equivalents",
      title: "Cash & Equivalents",
      columns: ["Asset", "Balance (USD)"],
      row: (r: any) => [r?.asset_name ?? "-", safeFormatCurrency(r?.balance_USD)],
    },
    {
      key: "direct_fixed_income",
      title: "Direct Fixed Income",
      columns: ["Bond", "Face Value", "Market Value (USD)"],
      row: (r: any) => [r?.bond_name ?? "-", safeNumber(r?.face_value), safeFormatCurrency(r?.market_value_USD)],
    },
    {
      key: "fixed_income_funds",
      title: "Fixed Income Funds",
      columns: ["Fund", "Units", "Market Value (USD)"],
      row: (r: any) => [r?.fund_name ?? "-", safeNumber(r?.units), safeFormatCurrency(r?.market_value_USD)],
    },
    {
      key: "direct_equities",
      title: "Direct Equities",
      columns: ["Stock", "Shares", "Market Value (USD)"],
      row: (r: any) => [r?.stock_name ?? "-", safeNumber(r?.number_of_shares), safeFormatCurrency(r?.market_value_USD)],
    },
    {
      key: "equities_fund",
      title: "Equity Funds",
      columns: ["Fund", "Units", "Market Value (USD)"],
      row: (r: any) => [r?.fund_name ?? "-", safeNumber(r?.units), safeFormatCurrency(r?.market_value_USD)],
    },
    {
      key: "alternative_fund",
      title: "Alternative Funds",
      columns: ["Fund", "Units", "Market Value (USD)"],
      row: (r: any) => [r?.fund_name ?? "-", safeNumber(r?.units), safeFormatCurrency(r?.market_value_USD)],
    },
    {
      key: "structured_products",
      title: "Structured Products",
      columns: ["Product", "Notional (USD)", "Market Value (USD)"],
      row: (r: any) => [
        r?.product_name ?? "-",
        safeFormatCurrency(r?.notional_USD),
        safeFormatCurrency(r?.market_value_USD),
      ],
    },
    {
      key: "loans",
      title: "Loans",
      columns: ["Loan", "Outstanding (USD)"],
      row: (r: any) => [r?.loan_description ?? "-", safeFormatCurrency(r?.outstanding_balance_USD)],
    },
  ];

  return (
    <div className="flex flex-col overflow-auto h-[calc(100vh-64px)] gap-4 p-4">
      {hasData ? (
        <>
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
                      // @ts-ignore
                      plugins: { ...pieOptions.plugins, title: { display: true, text: label } },
                    }}
                  />
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid grid-cols-1">
            {assetConfig.map((cfg, i) => (
              <Card key={i} className="card-hover mb-6">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xl">{cfg.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {tableDataArray.map((bank, bankIdx) => {
                      const rows = (bank as any)[cfg.key];
                      if (!rows?.length) return null;
                      return (
                        <div key={bankIdx}>
                          <div
                            className={`grid font-bold py-2 border-b border-gray-300 grid-cols-${cfg.columns.length}`}
                          >
                            <div>{bank.bank}</div>
                            {cfg.columns.length === 3 && <div className="text-center">{cfg.columns[1]}</div>}
                            <div className="text-right">{cfg.columns[cfg.columns.length - 1]}</div>
                          </div>
                          {rows.map((row: any, rowIdx: number) => {
                            const cells = cfg.row(row);
                            return (
                              <div
                                key={rowIdx}
                                className={`grid py-2 border-b border-gray-100 last:border-0 hover:bg-gray-50 grid-cols-${cells.length}`}
                              >
                                <div className="text-sm">{cells[0]}</div>
                                {cells.length === 3 && <div className="text-sm text-center">{cells[1]}</div>}
                                <div className="text-sm text-right">{cells[cells.length - 1]}</div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            ))}
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
