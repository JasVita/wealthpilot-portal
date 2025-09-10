"use client";

import * as React from "react";
import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { format, subDays } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { CalendarIcon, Check, ChevronsUpDown, Filter, Search, X } from "lucide-react";
import { fmtCurrency2 as money } from "@/lib/format";
import { useClientStore } from "@/stores/clients-store";
import { cn } from "@/lib/utils";

// shadcn pieces
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Calendar } from "@/components/ui/calendar";

type HoldingRow = {
  id: number;
  type: string;
  asOfDate: string;
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

// column widths (px) – tuned to your layout
const COL = {
  date:     "min-w-[120px] w-[120px]",
  type:     "min-w-[160px] w-[160px]",  
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
const fmtDateOnly = (v?: string) => (v ? (new Date(v)).toISOString().slice(0, 10) : "");

export default function DailyHoldingsPage() {
  const search = useSearchParams();
  const router = useRouter();
  const { clients, currClient } = useClientStore();

  // ── Date state (calendar); default today, allow ?date=YYYY-MM-DD
  const initialDate = (() => {
    const fromUrl = search.get("date");
    if (fromUrl) {
      const d = new Date(fromUrl);
      if (!Number.isNaN(+d)) return d;
    }
    return new Date();
  })();
  const [selectedDate, setSelectedDate] = useState<Date>(initialDate);

  // reflect to ?date=
  useEffect(() => {
    const sp = new URLSearchParams(search.toString());
    setParam(router, sp, "date", format(selectedDate, "yyyy-MM-dd"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate]);

  // filters (no range)
  const [q, setQ] = useState(search.get("q") ?? "");
  const [banks, setBanks] = useState<string[]>(search.get("banks")?.split(",").filter(Boolean) ?? []);
  const [accounts, setAccounts] = useState<string[]>(search.get("accts")?.split(",").filter(Boolean) ?? []);
  const [ccy, setCcy] = useState<string | "ALL">((search.get("ccy") as any) || "ALL");
  const [drawerOpen, setDrawerOpen] = useState(false);

  const [rows, setRows] = useState<HoldingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [sel, setSel] = useState<HoldingRow | null>(null);

  // simple loader that tries the chosen date; if empty, walk back up to 30 days
  useEffect(() => {
    let alive = true;

    async function load(dateToTry: Date) {
      setLoading(true);
      const ymd = format(dateToTry, "yyyy-MM-dd");
      const res = await fetch(`/api/trades/daily-holdings?date=${ymd}`, { cache: "no-store" });
      const data = await res.json();
      if (!alive) return null;
      setRows(data.rows ?? []);
      setLoading(false);
      return (data.rows ?? []) as HoldingRow[];
    }

    (async () => {
      // try chosen date
      let d = selectedDate;
      let got = await load(d);
      // if empty, walk back up to 30 days
      for (let i = 0; got && got.length === 0 && i < 30; i++) {
        d = subDays(d, 1);
        got = await load(d);
        if (got && got.length > 0) {
          // move the UI to the nearest date that has rows
          setSelectedDate(d);
          break;
        }
      }
    })();

    return () => { alive = false; };
  }, [selectedDate]);

  // unique lists
  const uniqBanks = useMemo(() => Array.from(new Set(rows.map(r => r.bank))).sort(), [rows]);
  const uniqAccounts = useMemo(() => Array.from(new Set(rows.map(r => r.account))).sort(), [rows]);

  // filter in-memory
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

  // chips
  const ccyTotals = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of filtered) if (r.ccy && r.balance != null) m.set(r.ccy, (m.get(r.ccy) ?? 0) + r.balance);
    return Array.from(m.entries()).map(([ccy, v]) => ({ ccy, v }));
  }, [filtered]);

  // persist non-date filters in URL (clean: no min/max/whatever)
  useEffect(() => {
    const sp = new URLSearchParams(search.toString());
    setParam(router, sp, "q", q || null);
    setParam(router, sp, "banks", banks.length ? banks.join(",") : null);
    setParam(router, sp, "accts", accounts.length ? accounts.join(",") : null);
    setParam(router, sp, "ccy", ccy === "ALL" ? null : String(ccy));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, banks, accounts, ccy]);

  return (
    <div className="p-4 md:p-6 space-y-3">
      {/* Top controls: Date + Bank + Account  |  Search + Filters */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        {/* LEFT: date + bank + account (same row; wraps on small screens) */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Date */}
          <div className="flex items-center gap-2">
            <Label className="text-xs text-muted-foreground">Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "h-9 w-[180px] justify-start text-left font-normal",
                    !selectedDate && "text-muted-foreground",
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {selectedDate ? format(selectedDate, "yyyy-MM-dd") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(d) => d && setSelectedDate(d)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Bank */}
          <MultiSelect label="Bank" options={uniqBanks} values={banks} onChange={setBanks} placeholder="All banks"/>
          {/* Account */}
          <MultiSelect label="Account" options={uniqAccounts} values={accounts} onChange={setAccounts} placeholder="All accounts"/>
        </div>

        {/* RIGHT: search + filters */}
        <div className="flex items-center gap-2">
          <div className="relative w-[280px]">
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search security, bank, account, ISIN…" className="pl-8"/>
            <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          </div>
          <Button variant="outline" size="sm" onClick={() => setDrawerOpen(true)}>
            <Filter className="mr-2 h-4 w-4" />
            Filters
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-left gap-2">
        {ccyTotals.length === 0 ? (
          <Badge variant="secondary">No currency impact</Badge>
        ) : (
          ccyTotals.map((c) => (
            <Card key={c.ccy} className="h-9">
              <CardContent className="h-full w-full px-3 py-0">
                <div className="h-full w-full flex items-center justify-center gap-2 leading-none">
                  <span className="text-[11px] font-semibold tracking-wide">{c.ccy}</span>
                  <span className={cn("inline-flex items-center leading-none", (c.v ?? 0) >= 0 ? "text-emerald-600" : "text-red-600")}>
                    {money(Math.abs(c.v ?? 0))}<span className="ml-1">{(c.v ?? 0) >= 0 ? "▲" : "▼"}</span>
                  </span>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <Separator />

      {/* table */}
      <div className="rounded-xl border">
        <div className="overflow-auto">
          <Table className="text-sm table-fixed w-full">
            <TableHeader className="bg-background">
              <TableRow className="hover:bg-transparent [&>th]:px-3 [&>th]:py-2 text-md text-muted-foreground">
                <TableHead className={`${COL.date} truncate`}>Date</TableHead>
                <TableHead className={`${COL.type} truncate`}>Type</TableHead>
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
                <TableRow>
                  <TableCell colSpan={12} className="px-3 py-8 text-center text-muted-foreground">
                    Loading…
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={12} className="px-3 py-8 text-center text-muted-foreground">
                    No results
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((r) => {
                  // ----- NEW DISPLAY LOGIC -----
                  // 1) Units: show "—" when null or 0
                  const unitsDisplay =
                    r.units == null || r.units === 0 ? "—" : r.units.toLocaleString();

                  // 2) Balance: when units is present & not 0 -> show "—"; else show money if available
                  const hideBalance = r.units != null && r.units !== 0;
                  const balanceDisplay = hideBalance
                    ? "—"
                    : (r.balance != null ? money(r.balance) : "—");
                  // -----------------------------

                  return (
                    <TableRow
                      key={r.id}
                      onClick={() => setSel(r)}
                      className="cursor-pointer border-t hover:bg-muted/40"
                    >
                      <TableCell className={`${COL.date} whitespace-nowrap overflow-hidden text-ellipsis px-3 py-2`}>
                        {fmtDateOnly(r.asOfDate)}
                      </TableCell>
                      <TableCell className={`${COL.type} whitespace-nowrap overflow-hidden text-ellipsis px-3 py-2`} title={r.type ?? "—"}>
                        {r.type ?? "—"}
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
                      <TableCell className={`${COL.units} tabular-nums px-3 py-2`}>
                        {unitsDisplay}
                      </TableCell>
                      <TableCell className={`${COL.price} tabular-nums px-3 py-2`}>
                        {r.price != null ? r.price.toLocaleString() : "—"}
                      </TableCell>
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

      {/* details drawer */}
      <Sheet open={!!sel} onOpenChange={(o) => !o && setSel(null)}>
        <SheetContent side="right" className="w-[420px] sm:w-[520px] px-4 sm:px-6">
          <SheetHeader>
            <SheetTitle>Holding Details</SheetTitle>
            <SheetDescription className="px-1">{sel?.name}</SheetDescription>
          </SheetHeader>
          {sel && (
            <div className="mt-4 space-y-3 text-sm px-1">
              <InfoRow k="Type" v={sel.type ?? "—"} />
              <InfoRow k="As of Date" v={fmtDateOnly(sel.asOfDate)} />
              <InfoRow k="Bank" v={sel.bank} />
              <InfoRow k="Account" v={sel.account} />
              <InfoRow k="Ticker" v={sel.ticker ?? "—"} />
              <InfoRow k="ISIN" v={sel.isin ?? "—"} />
              <Separator />
              <InfoRow k="Units" v={sel.units != null && sel.units !== 0 ? sel.units.toLocaleString() : "—"} />
              <InfoRow k="Price" v={sel.price != null ? sel.price.toLocaleString() : "—"} />
              <InfoRow
                k="Balance"
                v={sel.units != null && sel.units !== 0 ? "—" : (sel.balance != null ? money(sel.balance) : "—")}
              />
              <InfoRow k="Currency" v={sel.ccy} />
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

/* helpers */
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
