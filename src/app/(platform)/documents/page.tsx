"use client";

import { useState, Fragment } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useWealthStore } from "@/stores/wealth-store";
import { Download, FileText } from "lucide-react";
import { StockTable } from "@/types";

const formatCurrency = (value: number): string =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);

const safeFormatCurrency = (value?: number | null) => (value != null ? formatCurrency(value) : "-");
const safeNumber = (value?: number | null) => (value != null ? value.toLocaleString() : "-");

const BankTables = ({ banks = [] }: { banks?: StockTable[] }) => {
  // const { tableDataArray } = useWealthStore(); // still needed for cfg.row()

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
    <div className="grid grid-cols-1 max-w-1/2 w-1/2">
      {assetConfig.map((cfg, i) => (
        <Card key={i} className="card-hover mb-6">
          <CardHeader className="pb-2">
            <CardTitle className="text-xl">{cfg.title}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {banks.map((bank, bankIdx) => {
                const rows = (bank as any)?.[cfg.key];
                if (!rows?.length) return null;
                return (
                  <div key={bankIdx}>
                    <div className={`grid font-bold py-2 border-b border-gray-300 grid-cols-${cfg.columns.length}`}>
                      <div>{bank?.bank ?? "Unnamed Bank"}</div>
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
  );
};

function buildPdfSrc(url: string) {
  const [base, hash] = url.split("#");
  const flags = "toolbar=0&navpanes=0&scrollbar=0&view=FitH"; // ✂  UI + grey border
  return `${base}#${hash ? `${hash}&` : ""}${flags}`;
}

export default function DocumentsPage() {
  const { uploadBatches = [] } = useWealthStore();
  const [search, setSearch] = useState("");

  const filteredBatches = uploadBatches.filter((b: any) =>
    (b?.bankTags ?? []).join(" ").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <main className="p-6">
      <div className="mb-6 max-w-md">
        <Input
          placeholder="Search by bank name or date..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {filteredBatches.length === 0 ? (
        <p className="text-muted-foreground">No matching uploads found.</p>
      ) : (
        <div className="space-y-4">
          {filteredBatches.map((batch: any, idx: number) => (
            <Dialog key={idx}>
              <DialogTrigger asChild>
                <Button variant="outline" className="w-full flex items-center gap-2 truncate">
                  <FileText className="w-5 h-5 flex-shrink-0" />
                  <span className="truncate">{(batch?.bankTags ?? ["Unnamed"]).join(", ")}</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="w-[calc(100%-40px)] h-[calc(100%-40px)] py-10 overflow-auto max-w-none sm:max-w-screen-2xl">
                <div className="flex justify-end mb-4 px-4">
                  <Button
                    variant="outline"
                    size="lg"
                    className="gap-2"
                    onClick={() => {
                      console.log(`batch.excelUrl`, batch.excelURL);
                      if (batch.excelURL) window.open(batch.excelURL, "_blank");
                    }}
                    disabled={!batch?.excelURL}
                  >
                    <Download className="h-4 w-4" />
                    Download Excel Report
                  </Button>
                </div>
                <DialogHeader className="p-4 hidden">
                  <DialogTitle className="truncate">{(batch?.bankTags ?? []).join(", ")}</DialogTitle>
                </DialogHeader>

                <div className="flex w-full h-[calc(100%-4rem)]">
                  <div className="w-1/2 px-2 overflow-auto flex flex-col gap-10">
                    {(batch?.urls ?? []).map((url: string | undefined, i: number) => (
                      <div className="flex flex-col flex-1" key={i}>
                        <span className="mb-2 text-xl font-semibold">
                          {batch?.bankTags?.[i] || batch?.names?.[i] || `File ${i + 1}`}
                        </span>

                        <iframe
                          key={i}
                          src={buildPdfSrc(url!)} // ➜ …document.pdf#toolbar=0&navpanes=0&scrollbar=0&view=FitH
                          className="flex-1 w-full border-0 bg-white"
                          allowFullScreen
                        />
                      </div>
                    ))}
                  </div>
                  <Fragment>
                    <BankTables banks={batch.banks} />
                  </Fragment>
                </div>
              </DialogContent>
            </Dialog>
          ))}
        </div>
      )}
    </main>
  );
}
