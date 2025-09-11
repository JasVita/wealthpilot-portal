// src/app/(platform)/trades/[clientId]/daily-transactions/page.tsx
"use client";

import * as React from "react";
import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { format } from "date-fns";
import type { DateRange } from "react-day-picker";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Calendar } from "@/components/ui/calendar";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";

import { CalendarIcon, Check, ChevronsUpDown, Filter, Search, X } from "lucide-react";
import { useClientStore } from "@/stores/clients-store";
import { cn } from "@/lib/utils";

import { usePrePill } from "@/hooks/use-prepill";
import { PillTabs } from "@/components/pill-tabs";

/* ---------- helpers ---------- */
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

/* ---------- table widths ---------- */
const COL = {
  date: "min-w-[100px] w-[100px]",
  cat:  "min-w-[140px] w-[140px]",
  acct: "min-w-[120px] w-[120px]",
  book: "min-w-[120px] w-[150px]",
  desc: "min-w-[340px] w-[440px]",
  amt:  "min-w-[140px] w-[140px] text-right",
  ccy:  "min-w-[60px]  w-[60px]  text-right",
  sign: "min-w-[60px] w-[80px]",
  file: "min-w-[220px] w-[260px]",
} as const;

/* ---------- API row ---------- */
type ApiRow = {
  category: string;
  bookingText: string;
  account: string;
  valueDate: string;
  description: string;
  amount: number | null;
  ccy: string;
  amountSign: "Inflow" | "Outflow";
  fileName: string | null;
};
type ApiResp = {
  rows: ApiRow[];
  categories: string[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export default function DailyTransactionsPage({
  params,
}: {
  params: Promise<{ clientId: string }>;
}) {
  const { clientId } = React.use(params);
  const search = useSearchParams();
  const router = useRouter();

  // keep client in store aligned
  const { currClient, setCurrClient } = useClientStore();
  useEffect(() => {
    if (clientId && clientId !== currClient) setCurrClient(clientId);
  }, [clientId, currClient, setCurrClient]);

  /* ---------- Date (range) ---------- */
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

  const dateKey = useMemo(() => {
    if (range?.from && range?.to && !sameDay(range.from, range.to)) {
      return `R:${format(range.from, "yyyy-MM-dd")}→${format(range.to, "yyyy-MM-dd")}`;
    }
    const d = range?.from ?? selectedDate;
    return `D:${format(d, "yyyy-MM-dd")}`;
  }, [range, selectedDate]);

  useEffect(() => {
    const sp = new URLSearchParams(search.toString());
    if (dateKey.startsWith("R:")) {
      const [fromS, toS] = dateKey.slice(2).split("→");
      setParam(router, sp, "date_from", fromS);
      setParam(router, sp, "date_to", toS);
      sp.delete("date");
    } else {
      const d = dateKey.slice(2);
      setParam(router, sp, "date", d);
      sp.delete("date_from"); sp.delete("date_to");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateKey]);

  /* ---------- Paging ---------- */
  const initialPageFromUrl = Math.max(1, Number(search.get("page") ?? 1));
  const [page, setPage] = useState<number>(initialPageFromUrl);
  const [pageSize] = useState<number>(20);
  useEffect(() => {
    const sp = new URLSearchParams(search.toString());
    setParam(router, sp, "page", String(page));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  /* ---------- Filters ---------- */
  const [q, setQ] = useState<string>(search.get("q") ?? "");
  const [accounts, setAccounts] = useState<string[]>(search.get("accts")?.split(",").filter(Boolean) ?? []);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // pills = categories
  const [pill, setPill] = useState<string>(search.get("pill") ?? "ALL");

  // persist pill + search + accounts
  useEffect(() => {
    const sp = new URLSearchParams(search.toString());
    setParam(router, sp, "pill", pill === "ALL" ? null : pill);
    setParam(router, sp, "q", q || null);
    setParam(router, sp, "accts", accounts.length ? accounts.join(",") : null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pill, q, accounts]);

  /* ---------- Data ---------- */
  const [rows, setRows] = useState<ApiRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [meta, setMeta] = useState<{ total: number; totalPages: number }>({ total: 0, totalPages: 1 });

  useEffect(() => {
    let alive = true;
    setLoading(true);

    const qp: string[] = [];
    if (dateKey.startsWith("R:")) {
      const [fromS, toS] = dateKey.slice(2).split("→");
      qp.push(`date_from=${encodeURIComponent(fromS)}`, `date_to=${encodeURIComponent(toS)}`);
    } else {
      const d = dateKey.slice(2);
      qp.push(`date=${encodeURIComponent(d)}`);
    }
    qp.push(`page=${page}`, `page_size=${pageSize}`);

    fetch(`/api/trades/daily-transactions?${qp.join("&")}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((data: ApiResp) => {
        if (!alive) return;
        setRows(data?.rows ?? []);
        setMeta({ total: data?.total ?? 0, totalPages: data?.totalPages ?? 1 });
      })
      .finally(() => alive && setLoading(false));

    return () => { alive = false; };
  }, [dateKey, page, pageSize]);

  const uniqAccounts = useMemo(() => Array.from(new Set(rows.map((r) => r.account))).sort(), [rows]);

  /* ---------- Pills + counts via usePrePill ---------- */
  const { countsMap, pills, allCount, filtered } = usePrePill<ApiRow>({
    rows,
    pillKey: (r) => r.category,
    activePill: pill,
    setActivePill: (p) => { setPill(p); setPage(1); },
    search: q,
    searchFn: (r) =>
      `${r.description} ${r.account} ${r.bookingText} ${r.category} ${r.ccy} ${r.amountSign} ${r.fileName ?? ""}`
        .toLowerCase(),
    extraFilters: [
      (r) => !accounts.length || accounts.includes(r.account),
    ],
    pillSort: (a, b) => a.localeCompare(b),
  });

  /* -------------------------------- UI -------------------------------- */
  return (
    <div className="p-4 md:p-6 space-y-3">
      {/* Toolbar — left: Date(range) + Account + Pills | right: Search */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          {/* Date (range) */}
          <div className="flex items-center gap-2">
            <Label className="text-xs text-muted-foreground">Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("h-9 w-[260px] justify-start text-left font-normal")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateKey.startsWith("R:")
                    ? dateKey.slice(2).replace("→", " → ")
                    : dateKey.slice(2)}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="range"
                  selected={range}
                  onSelect={(r: DateRange | undefined) => {
                    setRange(r);
                    setPage(1);
                    if (r?.from && !r?.to) setSelectedDate(r.from);
                  }}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Account multi-select */}
          <MultiSelect
            label="Account"
            options={uniqAccounts}
            values={accounts}
            onChange={(next) => { setAccounts(next); setPage(1); }}
            placeholder="All accounts"
          />

          {/* Category pills (with counts) */}
          <PillTabs
            value={pill}
            onChange={(v) => { setPill(v); setPage(1); }}
            allCount={allCount}
            pills={pills}
            counts={countsMap}
          />
        </div>

        {/* RIGHT — Search */}
        <div className="flex items-center gap-2">
          <div className="relative w-[530px]">
            <Input
              value={q}
              onChange={(e) => { setQ(e.target.value); setPage(1); }}
              placeholder="Search description / account / booking text / category / CCY / sign / filename"
              className="pl-8"
            />
            <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          </div>
          {/* <Button variant="outline" size="sm" onClick={() => setDrawerOpen(true)}>
            <Filter className="mr-2 h-4 w-4" />
            Filters
          </Button> */}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border">
        <div className="overflow-auto">
          <Table className="text-sm table-fixed w-full">
            <TableHeader className="bg-background">
              <TableRow className="hover:bg-transparent [&>th]:px-3 [&>th]:py-2 text-md text-muted-foreground">
                <TableHead className={`${COL.date} truncate`}>Date</TableHead>
                <TableHead className={`${COL.cat} truncate`}>Category</TableHead>
                <TableHead className={`${COL.acct} truncate`}>Account</TableHead>
                <TableHead className={`${COL.book} truncate`}>Booking Text</TableHead>
                <TableHead className={`${COL.desc} truncate`}>Description</TableHead>
                <TableHead className={`${COL.amt}  truncate`}>Amount</TableHead>
                <TableHead className={`${COL.ccy}  truncate`}>CCY</TableHead>
                <TableHead className={`${COL.sign} truncate`}>Sign</TableHead>
                <TableHead className={`${COL.file} truncate`}>File</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={9} className="px-3 py-8 text-center text-muted-foreground">
                    Loading…
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="px-3 py-8 text-center text-muted-foreground">
                    No results
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((r, i) => {
                  const signed = (r.amount ?? 0) * (r.amountSign === "Inflow" ? 1 : -1);
                  return (
                    <TableRow key={`${r.account}-${r.valueDate}-${i}`} className="border-t hover:bg-muted/40">
                      <TableCell className={`${COL.date} whitespace-nowrap overflow-hidden text-ellipsis px-3 py-2`}>
                        {r.valueDate}
                      </TableCell>
                      <TableCell className={`${COL.cat} whitespace-nowrap overflow-hidden text-ellipsis px-3 py-2`}>
                        <Badge variant="outline" className="rounded-full">{r.category}</Badge>
                      </TableCell>
                      <TableCell className={`${COL.acct} whitespace-nowrap overflow-hidden text-ellipsis px-3 py-2`} title={r.account}>
                        {r.account}
                      </TableCell>
                      <TableCell className={`${COL.book} whitespace-nowrap overflow-hidden text-ellipsis px-3 py-2`} title={r.bookingText}>
                        {r.bookingText}
                      </TableCell>
                      <TableCell className={`${COL.desc} px-3 py-2`}>
                        <div
                          className="whitespace-normal break-words text-[13px] text-muted-foreground leading-snug"
                          style={{
                            display: "-webkit-box",
                            WebkitLineClamp: 3,
                            WebkitBoxOrient: "vertical",
                            overflow: "hidden",
                          }}
                          title={r.description}
                        >
                          {r.description}
                        </div>
                      </TableCell>
                      <TableCell className={`${COL.amt} tabular-nums px-3 py-2 ${signed >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                        {Math.abs(r.amount ?? 0).toLocaleString()}
                      </TableCell>
                      <TableCell className={`${COL.ccy} px-3 py-2`}>{r.ccy}</TableCell>
                      <TableCell className={`${COL.sign} px-3 py-2`}>{r.amountSign}</TableCell>
                      
                      {/* <TableCell className={`${COL.file} px-3 py-2`} title={r.fileName ?? "—"}>
                        <div className="truncate">{r.fileName ?? "—"}</div>
                      </TableCell>                       */}

                      <TableCell className={`${COL.file} px-3 py-2`}>
                        <div
                          className="whitespace-normal break-words text-[13px] leading-snug"
                          style={{
                            display: "-webkit-box",
                            WebkitLineClamp: 3,
                            WebkitBoxOrient: "vertical",
                            overflow: "hidden",
                          }}
                          title={r.fileName ?? undefined}
                        >
                          {r.fileName ?? "—"}       
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between pt-2">
        <div className="text-xs text-muted-foreground">
          Page {page} / {meta.totalPages} • {meta.total.toLocaleString()} row(s)
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
            Prev
          </Button>
          <Button variant="outline" size="sm" disabled={page >= meta.totalPages} onClick={() => setPage((p) => p + 1)}>
            Next
          </Button>
        </div>
      </div>

      {/* Drawer saved for future server-backed filters */}
      {/* <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent side="right" className="w-[360px] sm:w-[420px]">
          <SheetHeader>
            <SheetTitle>Filters</SheetTitle>
            <SheetDescription>Refine results</SheetDescription>
          </SheetHeader>

          <div className="mt-4 space-y-4">
            <Button variant="secondary" onClick={() => setDrawerOpen(false)}>Apply</Button>
          </div>
        </SheetContent>
      </Sheet> */}
    </div>
  );
}

/* ---------- simple multi-select ---------- */
function MultiSelect({
  label,
  options,
  values,
  onChange,
  placeholder,
}: {
  label: string;
  options: string[];
  values: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const toggle = (o: string) => {
    if (values.includes(o)) onChange(values.filter((v) => v !== o));
    else onChange([...values, o]);
  };
  return (
    <div className="flex items-center gap-2">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="w-[220px] justify-between">
            <span className="truncate text-left">
              {values.length ? `${values.length} selected` : (placeholder || `All ${label.toLowerCase()}s`)}
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 opacity-60" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[280px] p-2">
          <div className="max-h-[280px] overflow-auto">
            {options.map((o) => (
              <button
                key={o}
                onClick={() => toggle(o)}
                className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left hover:bg-muted"
              >
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
