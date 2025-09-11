// src/app/(platform)/trades/[clientId]/daily-holdings/page.tsx
"use client";

import * as React from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { format, subDays } from "date-fns";
import type { DateRange } from "react-day-picker";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { CalendarIcon, Check, ChevronsUpDown, Filter, Search, X } from "lucide-react";
import { fmtCurrency2 as money, fmtNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Calendar } from "@/components/ui/calendar";

type HoldingRow = {
  id: number;
  assetClass: string;         // ⬅️ NEW: backend sends `assetClass` (title-cased)
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

// table widths
const COL = {
  assetClass:     "min-w-[160px] w-[160px]",
  bank:     "min-w-[120px] w-[120px]",
  account:  "min-w-[140px] w-[140px]",
  security: "min-w-[420px] w-[420px]",
  ticker:   "min-w-[90px]  w-[90px]",
  isin:     "min-w-[160px] w-[160px]",
  seckey:   "min-w-[140px] w-[140px]",
  units:    "min-w-[110px] w-[110px] text-right",
  price:    "min-w-[110px] w-[110px] text-right",
  balance:  "min-w-[140px] w-[140px] text-right",
  ccy:      "min-w-[70px]  w-[70px] text-right",
} as const;

function setParam(router: any, sp: URLSearchParams, key: string, val?: string | null) {
  const next = new URLSearchParams(sp);
  if (val == null || val === "") next.delete(key);
  else next.set(key, val);
  router.replace(`?${next.toString()}`);
}

const sameDay = (a?: Date, b?: Date) =>
  !!a && !!b &&
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

export default function DailyHoldingsPage() {
  const search = useSearchParams();
  const router = useRouter();

  // hydrate date/range from URL
  const initialRange: DateRange | undefined = (() => {
    const df = search.get("date_from");
    const dt = search.get("date_to");
    if (df) {
      const from = new Date(df);
      const to = dt ? new Date(dt) : undefined;
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

  // single source of truth for URL + fetch
  const fetchKey = useMemo(() => {
    if (range?.from && range?.to && !sameDay(range.from, range.to)) {
      return `R:${format(range.from, "yyyy-MM-dd")}→${format(range.to, "yyyy-MM-dd")}`;
    }
    const d = range?.from ?? selectedDate;
    return `D:${format(d, "yyyy-MM-dd")}`;
  }, [range, selectedDate]);

  // reflect into URL
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

  // filters
  const [q, setQ] = useState(search.get("q") ?? "");
  const [banks, setBanks] = useState<string[]>(search.get("banks")?.split(",").filter(Boolean) ?? []);
  const [accounts, setAccounts] = useState<string[]>(search.get("accts")?.split(",").filter(Boolean) ?? []);
  const [ccy, setCcy] = useState<string | "ALL">((search.get("ccy") as any) || "ALL");
  const [drawerOpen, setDrawerOpen] = useState(false);

  const [rows, setRows] = useState<HoldingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [sel, setSel] = useState<HoldingRow | null>(null);

  // StrictMode de-dupe: remember last fetchKey we started
  const lastFetchKeyRef = useRef<string>("");

  useEffect(() => {
    // de-dupe re-runs in React Strict Mode (dev)
    if (lastFetchKeyRef.current === fetchKey) return;
    lastFetchKeyRef.current = fetchKey;

    const ctl = new AbortController();
    let alive = true;

    async function run() {
      setLoading(true);

      // assemble query once from fetchKey
      const qs: string[] = [];
      if (fetchKey.startsWith("R:")) {
        const [fromS, toS] = fetchKey.slice(2).split("→");
        qs.push(`date_from=${fromS}`, `date_to=${toS}`);
      } else {
        qs.push(`date=${fetchKey.slice(2)}`);
      }

      // fetch for chosen key
      const res = await fetch(`/api/trades/daily-holdings?${qs.join("&")}`, { cache: "no-store", signal: ctl.signal });
      const data = await res.json();
      if (!alive) return;

      if (Array.isArray(data?.rows) && data.rows.length > 0) {
        setRows(data.rows);
        setLoading(false);
        return;
      }

      // backfill only in single-day mode, not in ranges
      if (!fetchKey.startsWith("R:")) {
        let d = new Date(fetchKey.slice(2));
        for (let i = 0; i < 30; i++) {
          d = subDays(d, 1);
          const res2 = await fetch(`/api/trades/daily-holdings?date=${format(d, "yyyy-MM-dd")}`, { cache: "no-store", signal: ctl.signal });
          const data2 = await res2.json();
          if (!alive) return;
          if (Array.isArray(data2?.rows) && data2.rows.length > 0) {
            setRows(data2.rows);
            setSelectedDate(d); // move UI to nearest available day
            break;
          }
        }
      }

      setLoading(false);
    }

    run().catch(() => setLoading(false));
    return () => { alive = false; ctl.abort(); };
  }, [fetchKey]);

  const uniqBanks = useMemo(() => Array.from(new Set(rows.map(r => r.bank))).sort(), [rows]);
  const uniqAccounts = useMemo(() => Array.from(new Set(rows.map(r => r.account))).sort(), [rows]);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (banks.length && !banks.includes(r.bank)) return false;
      if (accounts.length && !accounts.includes(r.account)) return false;
      if (ccy !== "ALL" && r.ccy !== ccy) return false;
      if (q) {
        const hay = `${r.bank} ${r.account} ${r.name} ${r.ticker ?? ""} ${r.isin ?? ""}`.toLowerCase();
        if (!hay.includes(q.toLowerCase())) return false;
      }
      return true;
    });
  }, [rows, banks, accounts, q, ccy]);

  return (
    <div className="p-4 md:p-6 space-y-3">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap items-center gap-3">

          {/* Date (single or range) */}
          <div className="flex items-center gap-2">
            <Label className="text-xs text-muted-foreground">Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("h-9 w-[260px] justify-start text-left font-normal")}>
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
                    if (r?.from && !r?.to) setSelectedDate(r.from); // single click behaves like single-day
                  }}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Bank */}
          <MultiSelect label="Bank" options={uniqBanks} values={banks} onChange={setBanks} placeholder="All banks" />

          {/* Account */}
          <MultiSelect label="Account" options={uniqAccounts} values={accounts} onChange={setAccounts} placeholder="All accounts" />
        </div>

        {/* Search + Filters */}
        <div className="flex items-center gap-2">
          <div className="relative w-[280px]">
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search security, bank, account, ISIN…" className="pl-8" />
            <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          </div>
          <Button variant="outline" size="sm" onClick={() => setDrawerOpen(true)}>
            <Filter className="mr-2 h-4 w-4" /> Filters
          </Button>
        </div>
      </div>

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
                <TableHead className={`${COL.price} truncate`}>Price</TableHead>
                <TableHead className={`${COL.balance} truncate`}>Balance</TableHead>
                <TableHead className={`${COL.ccy} truncate`}>CCY</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={11} className="px-3 py-8 text-center text-muted-foreground">Loading…</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={11} className="px-3 py-8 text-center text-muted-foreground">No results</TableCell></TableRow>
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
                      <TableCell className={`${COL.security} whitespace-nowrap overflow-hidden text-ellipsis px-3 py-2`} title={r.name}>
                        {r.name}
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

      {/* Filters drawer */}
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
  );
}

function InfoRow({ k, v, className = "" }: { k: string; v: any; className?: string }) {
  return (
    <div className="flex items-center justify-between gap-6 px-1">
      <span className="text-xs text-muted-foreground">{k}</span>
      <span className={`font-medium ${className}`}>{String(v)}</span>
    </div>
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
