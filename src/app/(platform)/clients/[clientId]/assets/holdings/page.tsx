// src/app/(platform)/clients/[clientId]/assets/holdings/page.tsx
"use client";

import { useParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useContext } from "react";
import axios from "axios";

import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UsersRound } from "lucide-react";

import { useClientStore } from "@/stores/clients-store";
import { useCustodianStore } from "@/stores/custodian-store";
import { useClientFiltersStore } from "@/stores/client-filters-store";
import { AssetsExportContext } from "../layout";

type OverviewRow = {
  month_date: string | null;
  table_data: { tableData: any[] };
  pie_chart_data: { charts: any[] };
};

const assetKeys = [
  "cash_equivalents",
  "direct_fixed_income",
  "fixed_income_funds",
  "direct_equities",
  "equities_fund",
  "alternative_fund",
  "structured_product",
  "loans",
] as const;
type AssetKey = (typeof assetKeys)[number];

const assetLabels: Record<AssetKey, string> = {
  cash_equivalents:   "Cash & Equivalents",
  direct_fixed_income:"Direct Fixed Income",
  fixed_income_funds: "Fixed Income Funds",
  direct_equities:    "Direct Equities",
  equities_fund:      "Equity Funds",
  alternative_fund:   "Alternative Funds",
  structured_product: "Structured Products",
  loans:              "Loans",
};

// tolerate legacy keys
const keyAliases: Record<AssetKey, string[]> = {
  cash_equivalents:   ["cash_equivalents", "cash_and_equivalents"],
  direct_fixed_income:["direct_fixed_income"],
  fixed_income_funds: ["fixed_income_funds"],
  direct_equities:    ["direct_equities"],
  equities_fund:      ["equities_fund", "equity_funds"],
  alternative_fund:   ["alternative_fund", "alternative_funds"],
  structured_product: ["structured_product", "structured_products"],
  loans:              ["loans"],
};

const COL_W: Record<
  "bank" | "account_number" | "name" | "ticker" | "isin" | "currency" | "units" | "balance" | "price",
  string
> = {
  bank: "w-[10%]",
  account_number: "w-[16%]",
  name: "w-[30%]",
  ticker: "w-[8%]",
  isin: "w-[14%]",
  currency: "w-[6%]",
  units: "w-[8%]",
  balance: "w-[8%]",
  price: "w-[8%]",
};

const fmtCurrency = (v: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(v || 0);

const fmtNumberSmart = (v: number) => {
  const hasCents = Math.round((v * 100) % 100) !== 0;
  return v.toLocaleString("en-US", {
    minimumFractionDigits: hasCents ? 2 : 0,
    maximumFractionDigits: hasCents ? 4 : 0,
  });
};

export default function HoldingsPage() {
  const { currClient } = useClientStore();
  const { clientId: routeClientId } = useParams<{ clientId: string }>();
  const effectiveClientId = (currClient ?? routeClientId ?? "").toString();

  // global filters
  const { selected: selectedCustodian } = useCustodianStore();
  const { toDate, account } = useClientFiltersStore();

  const registerExport = useContext(AssetsExportContext);

  const [status, setStatus] = useState<"idle" | "loading" | "error" | "ready">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [overview, setOverview] = useState<OverviewRow | null>(null);

  // dedupe + cancel
  const lastKeyRef = useRef<string>("");
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!effectiveClientId) return;

    // avoid transient fetch while header is snapping "To"
    const waitingForTo =
      ((selectedCustodian && selectedCustodian !== "ALL") || (account && account !== "ALL")) && !toDate;
    if (waitingForTo) return;

    const params: Record<string, any> = { client_id: effectiveClientId };
    if (selectedCustodian && selectedCustodian !== "ALL") params.custodian = selectedCustodian;
    if (account && account !== "ALL") params.account = account;
    if (toDate) params.to = toDate;

    const key = JSON.stringify(params);
    if (key === lastKeyRef.current) return;
    lastKeyRef.current = key;

    setStatus("loading");
    if (abortRef.current) abortRef.current.abort();
    const ctr = new AbortController();
    abortRef.current = ctr;

    axios
      .get("/api/clients/assets/holdings", { params, signal: ctr.signal as any })
      .then(({ data }) => {
        const row = (Array.isArray(data?.overview_data) ? data.overview_data[0] : null) as OverviewRow | null;
        setOverview(row ?? null);
        setStatus("ready");
      })
      .catch((err) => {
        if ((err as any)?.name === "CanceledError" || (err as any)?.message === "canceled") return;
        setErrorMsg((err as any)?.message || "Unknown error");
        setOverview(null);
        setStatus("error");
      });

    return () => {
      if (abortRef.current) abortRef.current.abort();
    };
  }, [effectiveClientId, selectedCustodian, account, toDate]);

  const current = overview;

  // group rows by bucket
  const aggregatedTables = useMemo(() => {
    const acc = Object.fromEntries(assetKeys.map((k) => [k, [] as any[]])) as Record<AssetKey, any[]>;
    const banks = current?.table_data?.tableData ?? [];
    for (const bank of banks) {
      for (const k of assetKeys) {
        const alias = keyAliases[k].find((a) => bank[a] !== undefined);
        if (!alias) continue;
        const block = bank[alias];
        const rows = Array.isArray(block) ? block : Array.isArray(block?.rows) ? block.rows : [];
        for (const r of rows) {
          acc[k].push({
            bank: bank.bank ?? "—",
            account_number: bank.account_number ?? "—",
            ...r,
          });
        }
      }
    }
    return acc;
  }, [current]);

  // visible tabs and active tab
  const visibleAssetKeys: AssetKey[] = useMemo(
    () => assetKeys.filter((k) => (aggregatedTables[k] ?? []).length > 0),
    [aggregatedTables]
  );
  const [activeAssetTab, setActiveAssetTab] = useState<AssetKey>("cash_equivalents");
  useEffect(() => {
    if (!visibleAssetKeys.length) return;
    if (!visibleAssetKeys.includes(activeAssetTab)) setActiveAssetTab(visibleAssetKeys[0]);
  }, [visibleAssetKeys, activeAssetTab]);

  const rows = useMemo(
    () => (visibleAssetKeys.length ? aggregatedTables[activeAssetTab] ?? [] : []),
    [aggregatedTables, activeAssetTab, visibleAssetKeys]
  );

  // optional export hook
  useEffect(() => {
    registerExport?.(() => {
      /* add PDF export for holdings if needed */
    });
    return () => registerExport?.(undefined);
  }, [registerExport]);

  // UI states
  if (status === "idle") {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-4 p-6 text-center">
        <UsersRound className="h-10 w-10 text-muted-foreground" />
        <h3 className="text-lg font-semibold">No client selected</h3>
        <p className="max-w-md text-sm text-muted-foreground">
          Choose a client from the sidebar — or create a new one to start uploading statements.
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

  if (status === "error" || !current) {
    return <p className="p-6 text-muted-foreground">{errorMsg || "No holdings for the selected filters."}</p>;
  }

  const hasHoldings = visibleAssetKeys.length > 0;

  return (
    <div className="flex flex-col gap-4">
      {hasHoldings && (
        <div
          className="sticky z-30 bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/70 border-b -mt-px"
          style={{ top: -16 }}
        >
          <div className="px-4">
            <Tabs value={activeAssetTab} onValueChange={(v) => setActiveAssetTab(v as AssetKey)} className="w-full">
              <TabsList className="grid w-full gap-2 grid-cols-2 md:grid-cols-4 xl:grid-cols-8">
                {visibleAssetKeys.map((k) => (
                  <TabsTrigger key={k} value={k} title={assetLabels[k]} className="min-w-0 truncate text-xs md:text-sm px-3 py-2">
                    {assetLabels[k]}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>
        </div>
      )}

      {hasHoldings ? (
        <div className="px-4">
          <div className="rounded-md border overflow-hidden">
            <Table className="text-sm table-fixed w-full">
              <TableHeader className="bg-background">
                <TableRow className="hover:bg-transparent">
                  <TableHead className={`${COL_W.bank} truncate`}>Bank</TableHead>
                  <TableHead className={`${COL_W.account_number} truncate`}>Account</TableHead>
                  <TableHead className={`${COL_W.name} truncate`}>Name</TableHead>
                  <TableHead className={`${COL_W.ticker} truncate`}>Ticker</TableHead>
                  <TableHead className={`${COL_W.isin} truncate`}>ISIN</TableHead>
                  <TableHead className={`${COL_W.currency} truncate`}>Currency</TableHead>
                  <TableHead className={`${COL_W.units} truncate`}>Units</TableHead>
                  <TableHead className={`${COL_W.balance} truncate text-right`}>Balance (USD)</TableHead>
                  <TableHead className={`${COL_W.price} truncate text-right`}>Price</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r: any, i: number) => {
                  const units =
                    typeof r?.units === "number"
                      ? r.units.toLocaleString("en-US", { maximumFractionDigits: 4 })
                      : r?.units ?? "—";

                  const balanceUsd =
                    typeof r?.balance_usd === "number"
                      ? r.balance_usd
                      : typeof r?.balance === "number"
                        ? r.balance
                        : 0;

                  // Price: "-" when null/undefined, "0" when exactly 0, otherwise formatted
                  let priceOut = "—";
                  if (r?.price !== null && r?.price !== undefined) {
                    if (typeof r.price === "number") {
                      priceOut = r.price === 0 ? "0" : fmtNumberSmart(r.price);
                    } else {
                      const n = Number(r.price);
                      priceOut = Number.isFinite(n) ? (n === 0 ? "0" : fmtNumberSmart(n)) : "-";
                    }
                  }

                  return (
                    <TableRow key={`asset-row-${i}`} className="hover:bg-muted/40 border-b last:border-0">
                      <TableCell className={`${COL_W.bank} whitespace-nowrap overflow-hidden text-ellipsis`} title={r?.bank ?? "—"}>{r?.bank ?? "—"}</TableCell>
                      <TableCell className={`${COL_W.account_number} whitespace-nowrap overflow-hidden text-ellipsis`} title={r?.account_number ?? "—"}>{r?.account_number ?? "—"}</TableCell>

                      {/* Name: outer truncation; inner clamped to 3 lines */}
                      <TableCell className={`${COL_W.name} whitespace-nowrap overflow-hidden px-3 py-2`} title={r?.name ?? "—"}>
                        <div
                          className="whitespace-normal break-words text-xs md:text-[13px] leading-snug"
                          style={{
                            display: "-webkit-box",
                            WebkitLineClamp: 3,
                            WebkitBoxOrient: "vertical",
                            overflow: "hidden",
                          }}
                        >
                          {r?.name ?? "—"}
                        </div>
                      </TableCell>

                      <TableCell className={`${COL_W.ticker} whitespace-nowrap overflow-hidden text-ellipsis`} title={r?.ticker ?? "—"}>{r?.ticker ?? "—"}</TableCell>
                      <TableCell className={`${COL_W.isin} whitespace-nowrap overflow-hidden text-ellipsis`} title={r?.isin ?? "—"}>{r?.isin ?? "—"}</TableCell>
                      <TableCell className={`${COL_W.currency} whitespace-nowrap overflow-hidden text-ellipsis`} title={r?.currency ?? "—"}>{r?.currency ?? "—"}</TableCell>
                      <TableCell className={`${COL_W.units} whitespace-nowrap overflow-hidden text-ellipsis`} title={String(units)}>{units}</TableCell>
                      <TableCell className={`${COL_W.balance} whitespace-nowrap overflow-hidden text-ellipsis text-right tabular-nums`} title={fmtCurrency(balanceUsd)}>{fmtCurrency(balanceUsd)}</TableCell>
                      <TableCell className={`${COL_W.price} whitespace-nowrap overflow-hidden text-ellipsis text-right tabular-nums`} title={priceOut}>{priceOut}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      ) : (
        <div className="text-sm text-muted-foreground px-4 py-8">No holdings for the selected filters.</div>
      )}
    </div>
  );
}
