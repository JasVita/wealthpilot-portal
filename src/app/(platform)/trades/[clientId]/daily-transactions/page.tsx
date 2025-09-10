// src/app/(platform)/trades/[clientId]/daily-transactions/page.tsx
"use client";

import * as React from "react";
import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { format } from "date-fns";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar } from "@/components/ui/calendar";
import {
  Table, TableHeader, TableRow, TableHead, TableBody, TableCell,
} from "@/components/ui/table";

import { CalendarIcon, Check, ChevronsUpDown, Filter, Search, X } from "lucide-react";
import { useClientStore } from "@/stores/clients-store";
import { cn } from "@/lib/utils";

/* ---------- helpers ---------- */
function setParam(router: any, sp: URLSearchParams, key: string, val?: string | null) {
  const next = new URLSearchParams(sp);
  if (val == null || val === "") next.delete(key);
  else next.set(key, val);
  router.replace(`?${next.toString()}`);
}
const fmtDateOnly = (v?: string) => (v ? (new Date(v)).toISOString().slice(0, 10) : "");

/* ---------- Table widths (mirrors Daily Holdings look) ---------- */
const COL = {
  date:     "min-w-[120px] w-[120px]",
  cat:      "min-w-[160px] w-[160px]",
  acct:     "min-w-[160px] w-[160px]",
  book:     "min-w-[220px] w-[220px]",
  desc:     "min-w-[540px] w-[540px]",
  amt:      "min-w-[160px] w-[160px] text-right",
  ccy:      "min-w-[80px]  w-[80px]  text-right",
  sign:     "min-w-[120px] w-[120px]",
} as const;

/* ---------- API types (from /api/trades/daily-transactions) ---------- */
type ApiRow = {
  category: string;       // e.g. "Dividend", "Wire Out"
  bookingText: string;    // e.g. "cash & equivalents", "direct equities"
  account: string;        // e.g. "530-312828"
  valueDate: string;      // "YYYY-MM-DD"
  description: string;    // long text
  amount: number | null;  // number
  ccy: string;            // "USD", "HKD", ...
  amountSign: "Inflow" | "Outflow";
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

  // Sync client in store (just to keep parity with the rest of the app)
  const { currClient, setCurrClient } = useClientStore();
  useEffect(() => {
    if (clientId && clientId !== currClient) setCurrClient(clientId);
  }, [clientId, currClient, setCurrClient]);

  /* ---------- Date (calendar) ---------- */
  const initialDateFromUrl = search.get("date");
  const [selectedDate, setSelectedDate] = useState<Date>(() => {
    if (initialDateFromUrl) {
      const d = new Date(initialDateFromUrl);
      if (!Number.isNaN(+d)) return d;
    }
    return new Date();
  });
  const ymd = format(selectedDate, "yyyy-MM-dd");

  // Persist ?date=
  useEffect(() => {
    const sp = new URLSearchParams(search.toString());
    setParam(router, sp, "date", ymd);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ymd]);

  /* ---------- Paging ---------- */
  const initialPageFromUrl = Math.max(1, Number(search.get("page") ?? 1));
  const [page, setPage] = useState<number>(initialPageFromUrl);
  const [pageSize, setPageSize] = useState<number>(20);

  // Persist ?page=
  useEffect(() => {
    const sp = new URLSearchParams(search.toString());
    setParam(router, sp, "page", String(page));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  /* ---------- Filters ---------- */
  const [q, setQ] = useState<string>(search.get("q") ?? "");
  const [accounts, setAccounts] = useState<string[]>(search.get("accts")?.split(",").filter(Boolean) ?? []);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // dynamic categories from API
  const [categories, setCategories] = useState<string[]>([]);
  const [pill, setPill] = useState<string>(search.get("pill") ?? "ALL");

  // Persist simple filters to URL (so reloads/bookmarks work)
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

  // Load from real API
  useEffect(() => {
    let alive = true;
    setLoading(true);

    const sp: string[] = [];
    // API handles month-to-date from ?date= (or current month if omitted)
    if (ymd) sp.push(`date=${encodeURIComponent(ymd)}`);
    if (page) sp.push(`page=${page}`);
    if (pageSize) sp.push(`page_size=${pageSize}`);

    fetch(`/api/trades/daily-transactions${sp.length ? `?${sp.join("&")}` : ""}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((data: ApiResp) => {
        if (!alive) return;
        setRows(data?.rows ?? []);
        setCategories(data?.categories ?? []);
        setMeta({ total: data?.total ?? 0, totalPages: data?.totalPages ?? 1 });

        // if pill not in categories anymore, reset to ALL
        if (pill !== "ALL" && !(data?.categories ?? []).includes(pill)) setPill("ALL");
      })
      .finally(() => alive && setLoading(false));

    return () => { alive = false; };
  }, [ymd, page, pageSize, pill]); // pill doesn't change the API result but we want to refilter; keeping as dep is safe

  // Account options from loaded page (or compute across rows in the page)
  const uniqAccounts = useMemo(() => Array.from(new Set(rows.map((r) => r.account))).sort(), [rows]);

  // FE filtering (category pill, accounts, search)
  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (pill !== "ALL" && r.category !== pill) return false;
      if (accounts.length && !accounts.includes(r.account)) return false;

      if (q) {
        const hay = `${r.category} ${r.bookingText} ${r.account} ${r.description}`.toLowerCase();
        if (!hay.includes(q.toLowerCase())) return false;
      }
      return true;
    });
  }, [rows, pill, accounts, q]);

  // Currency chips (sum signed amount by ccy)
  const ccyTotals = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of filtered) {
      const signed = (r.amount ?? 0) * (r.amountSign === "Inflow" ? 1 : -1);
      m.set(r.ccy, (m.get(r.ccy) ?? 0) + signed);
    }
    return Array.from(m.entries())
      .map(([ccy, v]) => ({ ccy, v }))
      .filter((x) => x.v !== 0);
  }, [filtered]);

  /* -------------------------------- UI -------------------------------- */
  return (
    <div className="p-4 md:p-6 space-y-3">
      {/* Toolbar — left: Date + Account + Category Pills | right: Search + Filters */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        {/* LEFT */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Date */}
          <div className="flex items-center gap-2">
            <Label className="text-xs text-muted-foreground">Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn("h-9 w-[180px] justify-start text-left font-normal")}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {format(selectedDate, "yyyy-MM-dd")}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(d) => d && (setSelectedDate(d), setPage(1))}
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

          {/* Category pills (dynamic from API) */}
          <Tabs value={pill} onValueChange={(v) => { setPill(v); setPage(1); }}>
            <TabsList className="h-8">
              <TabsTrigger value="ALL" className="text-xs">ALL</TabsTrigger>
              {categories.map((c) => (
                <TabsTrigger key={c} value={c} className="text-xs">
                  {c}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>

        {/* RIGHT */}
        <div className="flex items-center gap-2">
          <div className="relative w-[300px]">
            <Input
              value={q}
              onChange={(e) => { setQ(e.target.value); setPage(1); }}
              placeholder="Search description / account / booking text…"
              className="pl-8"
            />
            <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          </div>
          <Button variant="outline" size="sm" onClick={() => setDrawerOpen(true)}>
            <Filter className="mr-2 h-4 w-4" />
            Filters
          </Button>
        </div>
      </div>

      {/* Currency chips */}
      <div className="flex flex-wrap gap-2">
        {ccyTotals.length === 0 ? (
          <Badge variant="secondary">No currency impact</Badge>
        ) : (
          ccyTotals.map((c) => (
            <Card key={c.ccy} className="h-9">
              <CardContent className="h-full w-full px-3 py-0">
                <div className="h-full w-full flex items-center justify-center gap-2 leading-none">
                  <span className="text-[11px] font-semibold tracking-wide">{c.ccy}</span>
                  <span className={cn("inline-flex items-center leading-none", c.v >= 0 ? "text-emerald-600" : "text-red-600")}>
                    {Math.abs(c.v).toLocaleString()}
                    <span className="ml-1">{c.v >= 0 ? "▲" : "▼"}</span>
                  </span>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <Separator />

      {/* Table — fields present in API */}
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
                <TableHead className={`${COL.amt} truncate`}>Amount</TableHead>
                <TableHead className={`${COL.ccy} truncate`}>CCY</TableHead>
                <TableHead className={`${COL.sign} truncate`}>Sign</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="px-3 py-8 text-center text-muted-foreground">
                    Loading…
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="px-3 py-8 text-center text-muted-foreground">
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
                      <TableCell className={`${COL.desc} whitespace-nowrap overflow-hidden text-ellipsis px-3 py-2`} title={r.description}>
                        {r.description}
                      </TableCell>
                      <TableCell className={`${COL.amt} tabular-nums px-3 py-2 ${signed >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                        {Math.abs(r.amount ?? 0).toLocaleString()}
                      </TableCell>
                      <TableCell className={`${COL.ccy} px-3 py-2`}>{r.ccy}</TableCell>
                      <TableCell className={`${COL.sign} px-3 py-2`}>{r.amountSign}</TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Pagination (simple) */}
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

      {/* Filters drawer (kept for future extensibility) */}
      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent side="right" className="w-[360px] sm:w-[420px]">
          <SheetHeader>
            <SheetTitle>Filters</SheetTitle>
            <SheetDescription>Refine results</SheetDescription>
          </SheetHeader>

          <div className="mt-4 space-y-4">
            {/* You can add more server-backed filters later if your API supports them */}
            <Button variant="secondary" onClick={() => setDrawerOpen(false)}>
              Apply
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

/* ---------- small multi-select used for Account ---------- */
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
