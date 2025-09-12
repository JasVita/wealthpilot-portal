// src/app/(platform)/trades/[clientId]/daily-holdings/page.tsx
"use client";

import * as React from "react";
import { ClientOnly } from "@/components/ClientOnly"; 
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { format, subDays } from "date-fns";
import type { DateRange } from "react-day-picker";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { CalendarIcon, Check, ChevronsUpDown, Filter, Search, X } from "lucide-react";
import { fmtCurrency2 as money, fmtNumber, sameDay } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Calendar } from "@/components/ui/calendar";

import { usePrePill } from "@/hooks/use-prepill";       // ⬅️ reusable pill hook
import { PillTabs } from "@/components/pill-tabs";      // ⬅️ tiny pills UI with counts

type HoldingRow = {
  id: number;
  assetClass: string;
  bank: string;
  account: string;
  name: string;
  ticker?: string | null;
  isin?: string | null;
  ccy: string;
  units: number | null;
  price: number | null;
  balance: number | null;
  securityKey?: string | null;
};

const COL = {
  assetClass: "min-w-[160px] w-[160px]",
  bank:       "min-w-[60px] w-[120px]",
  account:    "min-w-[100px] w-[120px]",
  security:   "min-w-[220px] w-[320px]",
  ticker:     "min-w-[90px]  w-[90px]",
  isin:       "min-w-[120px] w-[140px]",
  seckey:     "min-w-[140px] w-[140px]",
  units:      "min-w-[110px] w-[110px] text-right",
  price:      "min-w-[120px] w-[120px] text-right",
  balance:    "min-w-[140px] w-[140px] text-right",
  ccy:        "min-w-[70px]  w-[70px] text-right",
} as const;

function setParam(router: any, sp: URLSearchParams, key: string, val?: string | null) {
  const next = new URLSearchParams(sp);
  if (val == null || val === "") next.delete(key);
  else next.set(key, val);
  router.replace(`?${next.toString()}`);
}

export default function DailyHoldingsPage() {
  const search = useSearchParams();
  const router = useRouter();

  // hydrate date/range from URL (date, or date_from/date_to)
  const initialRange: DateRange | undefined = (() => {
    const df = search.get("date_from");
    const dt = search.get("date_to");
    if (df) {
      const from = new Date(df);
      const to   = dt ? new Date(dt) : undefined;
      if (!Number.isNaN(+from) && (!dt || !Number.isNaN(+to!))) return { from, to };
    }
    const single = search.get("date");
    if (single) {
      const d = new Date(single);
      if (!Number.isNaN(+d)) return { from: d, to: undefined };
    }
    const today = new Date();
    return { from: today, to: undefined };
  })();

  const [range, setRange] = useState<DateRange | undefined>(initialRange);
  const [selectedDate, setSelectedDate] = useState<Date>(initialRange?.from ?? new Date());

  // pill value (asset class) persisted to URL
  const initialPillFromUrl = search.get("pill") ?? "ALL";
  const [pill, setPill] = useState<string>(initialPillFromUrl);

  // other filters / search
  const [q, setQ] = useState(search.get("q") ?? "");
  const [banks, setBanks] = useState<string[]>(search.get("banks")?.split(",").filter(Boolean) ?? []);
  const [accounts, setAccounts] = useState<string[]>(search.get("accts")?.split(",").filter(Boolean) ?? []);
  const [ccy, setCcy] = useState<string | "ALL">((search.get("ccy") as any) || "ALL");
  const [drawerOpen, setDrawerOpen] = useState(false);

  // data + loading
  const [rows, setRows] = useState<HoldingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [sel, setSel] = useState<HoldingRow | null>(null);

  // === Single source for URL + fetch logic
  const fetchKey = useMemo(() => {
    if (range?.from && range?.to && !sameDay(range.from, range.to)) {
      return `R:${format(range.from, "yyyy-MM-dd")}→${format(range.to, "yyyy-MM-dd")}`;
    }
    const d = range?.from ?? selectedDate;
    return `D:${format(d, "yyyy-MM-dd")}`;
  }, [range, selectedDate]);

  // reflect fetchKey -> URL
  useEffect(() => {
    const sp = new URLSearchParams(search.toString());
    if (fetchKey.startsWith("R:")) {
      const [fromS, toS] = fetchKey.slice(2).split("→");
      setParam(router, sp, "date_from", fromS);
      setParam(router, sp, "date_to", toS);
      sp.delete("date");
    } else {
      const d = fetchKey.slice(2);
      setParam(router, sp, "date", d);
      sp.delete("date_from"); sp.delete("date_to");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchKey]);

  // persist pill to URL
  useEffect(() => {
    const sp = new URLSearchParams(search.toString());
    setParam(router, sp, "pill", pill === "ALL" ? null : pill);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pill]);

  // fetch rows for date OR range (with backfill in single-day mode)
  const lastFetchKeyRef = useRef<string>("");
  useEffect(() => {
    if (lastFetchKeyRef.current === fetchKey) return;
    lastFetchKeyRef.current = fetchKey;

    const ctl = new AbortController();
    let alive = true;

    async function run() {
      setLoading(true);
      const qs: string[] = [];
      if (fetchKey.startsWith("R:")) {
        const [fromS, toS] = fetchKey.slice(2).split("→");
        qs.push(`date_from=${fromS}`, `date_to=${toS}`);
      } else {
        qs.push(`date=${fetchKey.slice(2)}`);
      }

      const res = await fetch(`/api/trades/daily-holdings?${qs.join("&")}`, { cache: "no-store", signal: ctl.signal });
      const data = await res.json();
      if (!alive) return;

      if (Array.isArray(data?.rows) && data.rows.length > 0) {
        setRows(data.rows);
        setLoading(false);
        return;
      }

      if (!fetchKey.startsWith("R:")) {
        let d = new Date(fetchKey.slice(2));
        for (let i = 0; i < 30; i++) {
          d = subDays(d, 1);
          const res2 = await fetch(`/api/trades/daily-holdings?date=${format(d, "yyyy-MM-dd")}`, { cache: "no-store", signal: ctl.signal });
          const data2 = await res2.json();
          if (!alive) return;
          if (Array.isArray(data2?.rows) && data2.rows.length > 0) {
            setRows(data2.rows);
            setSelectedDate(d);
            break;
          }
        }
      }
      setLoading(false);
    }

    run().catch(() => setLoading(false));
    return () => { alive = false; ctl.abort(); };
  }, [fetchKey]);

  // build the “pre-pill” pipeline:
  //   - extra filters (bank/account/ccy)
  //   - broader search (includes ticker/ccy/assetClass)
  //   - counts per assetClass, pill list, final filtered rows
  const { countsMap, pills, allCount, filtered } = usePrePill<HoldingRow>({
    rows,
    pillKey: (r) => r.assetClass,
    activePill: pill,
    setActivePill: setPill,
    search: q,
    searchFn: (r) =>
      `${r.bank} ${r.account} ${r.name} ${r.ticker ?? ""} ${r.isin ?? ""} ${r.ccy ?? ""} ${r.assetClass ?? ""}`.toLowerCase(),
    extraFilters: [
      (r) => !banks.length || banks.includes(r.bank),
      (r) => !accounts.length || accounts.includes(r.account),
      (r) => ccy === "ALL" || r.ccy === ccy,
    ],
    pillSort: (a, b) => a.localeCompare(b),
  });

  // distinct lists (for dropdowns)
  const uniqBanks = useMemo(() => Array.from(new Set(rows.map(r => r.bank))).sort(), [rows]);
  const uniqAccounts = useMemo(() => Array.from(new Set(rows.map(r => r.account))).sort(), [rows]);

  return (
    <ClientOnly>
      <div className="p-4 md:p-6 space-y-3">
      {/* Row 1: Date + Bank + Account  |  Search */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        {/* LEFT: date + bank + account */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Date (range) */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Label className="text-xs text-muted-foreground">Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "h-9 w-full sm:w-[260px] justify-start text-left font-normal"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {fetchKey.startsWith("R:")
                    ? fetchKey.slice(2).replace("→", " → ")
                    : fetchKey.slice(2)}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="range"
                  selected={range}
                  onSelect={(r) => {
                    setRange(r);
                    if (r?.from && !r?.to) setSelectedDate(r.from);
                  }}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

            {/* Bank */}
            <div className="w-full sm:w-auto">
              <MultiSelect
                label="Bank"
                options={uniqBanks}
                values={banks}
                onChange={setBanks}
                placeholder="All banks"
              />
            </div>

            {/* Account */}
            <div className="w-full sm:w-auto">
              <MultiSelect
                label="Account"
                options={uniqAccounts}
                values={accounts}
                onChange={setAccounts}
                placeholder="All accounts"
              />
            </div>
          </div>

          {/* RIGHT: search */}
          <div className="w-full md:w-[450px]">
            <div className="relative">
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search security / bank / account / ISIN / Ticker / CCY / Asset class"
                className="pl-8 w-full"
              />
              <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            </div>
          </div>
        </div>

        {/* Asset-class pills with counts */}
        <PillTabs
          value={pill}
          onChange={setPill}
          allCount={allCount}
          pills={pills}
          counts={countsMap}
          className="mt-1 mb-2"
        />

        {/* Table */}
        <div className="rounded-xl border">
          <div className="overflow-auto">
            <Table className="text-sm table-fixed w-full">
              <TableHeader className="bg-background">
                <TableRow className="hover:bg-transparent [&>th]:px-3 [&>th]:py-2 text-md text-muted-foreground">
                  <TableHead className={`${COL.assetClass} truncate`}>Asset Class</TableHead>
                  <TableHead className={`${COL.bank} truncate`}>Bank</TableHead>
                  <TableHead className={`${COL.account} truncate`}>Account</TableHead>
                  <TableHead className={`${COL.security} truncate`}>Security</TableHead>
                  <TableHead className={`${COL.ticker} truncate`}>Ticker</TableHead>
                  <TableHead className={`${COL.isin} truncate`}>ISIN</TableHead>
                  <TableHead className={`${COL.seckey} truncate`}>Sec. Key</TableHead>
                  <TableHead className={`${COL.units} truncate`}>Units</TableHead>
                  <TableHead className={`${COL.price} truncate`}>Weighted Price</TableHead>
                  <TableHead className={`${COL.balance} truncate`}>Balance</TableHead>
                  <TableHead className={`${COL.ccy} truncate`}>CCY</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={11} className="px-3 py-8 text-center text-muted-foreground">Loading…</TableCell>
                  </TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={11} className="px-3 py-8 text-center text-muted-foreground">No results</TableCell>
                  </TableRow>
                ) : (
                  filtered.map((r) => {
                    const unitsDisplay = r.units == null || r.units === 0 ? "—" : fmtNumber(r.units, 4, 0);
                    const hideBalance = r.units != null && r.units !== 0;
                    const balanceDisplay = hideBalance ? "—" : (r.balance != null ? money(r.balance) : "—");

                    return (
                      <TableRow key={r.id} className="cursor-pointer border-t hover:bg-muted/40">
                        <TableCell className={`${COL.assetClass} whitespace-nowrap overflow-hidden text-ellipsis px-3 py-2`} title={r.assetClass ?? "—"}>
                          {r.assetClass ?? "—"}
                        </TableCell>
                        <TableCell className={`${COL.bank} whitespace-nowrap overflow-hidden text-ellipsis px-3 py-2`} title={r.bank}>
                          {r.bank}
                        </TableCell>
                        <TableCell className={`${COL.account} whitespace-nowrap overflow-hidden text-ellipsis px-3 py-2`} title={r.account}>
                          {r.account}
                        </TableCell>
                        <TableCell className={`${COL.security} whitespace-nowrap overflow-hidden px-3 py-2`}>
                          <div
                            className="whitespace-normal break-words text-xs md:text-[13px] leading-snug"
                            style={{
                              display: "-webkit-box",
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: "vertical",
                              overflow: "hidden",
                            }}
                            title={r.name}
                          >
                            {r.name}
                          </div>
                        </TableCell>
                        <TableCell className={`${COL.ticker} whitespace-nowrap overflow-hidden text-ellipsis px-3 py-2`} title={r.ticker ?? "—"}>
                          {r.ticker ?? "—"}
                        </TableCell>
                        <TableCell className={`${COL.isin} whitespace-nowrap overflow-hidden text-ellipsis px-3 py-2`} title={r.isin ?? "—"}>
                          {r.isin ?? "—"}
                        </TableCell>
                        <TableCell className={`${COL.seckey} whitespace-nowrap overflow-hidden text-ellipsis px-3 py-2`} title={r.securityKey ?? "—"}>
                          {r.securityKey ?? "—"}
                        </TableCell>
                        <TableCell className={`${COL.units} tabular-nums px-3 py-2`}>{unitsDisplay}</TableCell>
                        <TableCell className={`${COL.price} tabular-nums px-3 py-2`}>{r.price != null ? fmtNumber(r.price, 4, 0) : "—"}</TableCell>
                        <TableCell className={`${COL.balance} tabular-nums px-3 py-2 ${!hideBalance && (r.balance ?? 0) < 0 ? "text-red-600" : !hideBalance ? "text-emerald-600" : ""}`}>
                          {balanceDisplay}
                        </TableCell>
                        <TableCell className={`${COL.ccy} px-3 py-2`}>{r.ccy}</TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Filters drawer (kept for future) */}
        <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
          <SheetContent side="right" className="w-[360px] sm:w-[420px]">
            <SheetHeader>
              <SheetTitle>Filters</SheetTitle>
              <SheetDescription>Refine results</SheetDescription>
            </SheetHeader>
            <div className="mt-4 space-y-4">
              <Button variant="secondary" onClick={() => setDrawerOpen(false)}>Apply</Button>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </ClientOnly>
  );
}

function MultiSelect({
  label, options, values, onChange, placeholder,
}: { label: string; options: string[]; values: string[]; onChange: (next: string[]) => void; placeholder?: string }) {
  const [open, setOpen] = useState(false);
  const toggle = (o: string) => (values.includes(o) ? onChange(values.filter((v) => v !== o)) : onChange([...values, o]));
  return (
    <div className="flex items-center gap-2">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="w-[220px] justify-between">
            <span className="truncate text-left">{values.length ? `${values.length} selected` : (placeholder || `All ${label.toLowerCase()}s`)}</span>
            <ChevronsUpDown className="ml-2 h-4 w-4 opacity-60" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[280px] p-2">
          <div className="max-h-[280px] overflow-auto">
            {options.map((o) => (
              <button key={o} onClick={() => toggle(o)} className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left hover:bg-muted">
                <span className="truncate">{o}</span>
                {values.includes(o) ? <Check className="h-4 w-4" /> : null}
              </button>
            ))}
          </div>
          {values.length > 0 && (
            <>
              <Separator className="my-2" />
              <Button variant="ghost" size="sm" className="w-full" onClick={() => onChange([])}>
                <X className="mr-2 h-4 w-4" /> Clear
              </Button>
            </>
          )}
        </PopoverContent>
      </Popover>
    </div>
  );
}
