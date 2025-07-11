/* ─────────────────── /transactions/page.tsx ─────────────────── */
"use client";

import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircleIcon } from "lucide-react";

import { DataTable } from "../documents/data-table";
import { useClientStore } from "@/stores/clients-store";

/* ---------- helpers ---------- */
const fmtDate = (d: string | Date | null | undefined) => (d ? new Date(d).toISOString().slice(0, 10) : "");

function applyColumnOrder<T extends Record<string, unknown>>(rows: T[], columnOrder: string[] | undefined): T[] {
  if (!columnOrder?.length) return rows;
  return rows.map((row) => {
    const ordered: Record<string, unknown> = {};
    columnOrder.forEach((k) => k in row && (ordered[k] = row[k]));
    Object.keys(row).forEach((k) => !(k in ordered) && (ordered[k] = row[k]));
    return ordered as T;
  });
}

/* ---------- types ---------- */
type TableBlock = { columnOrder: string[]; rows: Record<string, any>[] };
type SubTableGroup = { subTableOrder: string[] } & Record<string, TableBlock>;
type TableRoot = { tableOrder: string[] } & Record<string, SubTableGroup | TableBlock>;

interface PortfolioDocument {
  bankname: string;
  as_of_date: string;
  transactions?: TableRoot;
}

/* ---------- page ---------- */
export default function AggregatedTransactionsPage() {
  const { currClient } = useClientStore();

  const [docs, setDocs] = useState<PortfolioDocument[]>([]);
  const [month, setMonth] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  /* unified status */
  const [status, setStatus] = useState<"idle" | "loading" | "error" | "ready">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  /* ── fetch documents for active client */
  useEffect(() => {
    if (!currClient) return;

    (async () => {
      setStatus("loading");
      try {
        const { data } = await axios.post<{
          status: string;
          documents: PortfolioDocument[];
          message: string;
        }>(`${process.env.NEXT_PUBLIC_API_URL}/documents`, {
          client_id: currClient,
        });

        if (data.status !== "ok") throw new Error(data.message);
        setDocs(data.documents ?? []);

        /* default to newest month */
        const months = Array.from(new Set((data.documents || []).map((d) => fmtDate(d.as_of_date).slice(0, 7)))).sort(
          (a, b) => (a > b ? -1 : 1)
        );
        if (months.length) setMonth(months[0]);

        setStatus("ready");
      } catch (err: any) {
        console.error("fetch documents failed:", err);
        setErrorMsg(err?.response?.data?.message || err.message || "Unknown error");
        setStatus("error");
      }
    })();
  }, [currClient]);

  /* ── docs filtered by month */
  const monthDocs = useMemo(() => {
    if (!month) return [] as PortfolioDocument[];
    return docs.filter((d) => fmtDate(d.as_of_date).startsWith(month));
  }, [docs, month]);

  /* ── aggregate tables */
  const aggregated = useMemo(() => {
    const acc: Record<string, any[]> = {};

    monthDocs.forEach((doc) => {
      const root = doc.transactions;
      if (!root?.tableOrder?.length) return;

      root.tableOrder.forEach((catKey) => {
        const cat = root[catKey] as SubTableGroup | TableBlock | undefined;
        if (!cat) return;

        const pushRows = (title: string, rows: any[]) => {
          if (!acc[title]) acc[title] = [];
          rows.forEach((r) => acc[title].push({ bank: doc.bankname, ...r }));
        };

        if ("subTableOrder" in cat && Array.isArray(cat.subTableOrder)) {
          cat.subTableOrder.forEach((subKey) => {
            const tbl = cat[subKey] as TableBlock | undefined;
            if (!tbl?.rows?.length) return;
            const rows = applyColumnOrder(tbl.rows, tbl.columnOrder);
            const title = `${catKey.replace(/_/g, " ")} – ${subKey.replace(/_/g, " ")}`;
            pushRows(title, rows);
          });
        } else if ((cat as TableBlock).rows?.length) {
          const tbl = cat as TableBlock;
          const rows = applyColumnOrder(tbl.rows, tbl.columnOrder);
          const title = catKey.replace(/_/g, " ");
          pushRows(title, rows);
        }
      });
    });

    return acc;
  }, [monthDocs]);

  const tableTitles = useMemo(() => Object.keys(aggregated).sort(), [aggregated]);
  const visibleTitles = tableTitles.filter((t) => t.toLowerCase().includes(search.toLowerCase()));

  /* ---------- 1. loading state ---------- */
  if (status === "idle") return <></>;
  if (status === "loading")
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-1/3 rounded" />
        <Skeleton className="h-8 w-1/4 rounded" />
        <Skeleton className="h-[320px] w-full rounded-xl" />
      </div>
    );

  /* ---------- 2. error state ---------- */
  if (status === "error")
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertCircleIcon className="h-5 w-5" />
          <AlertTitle>Unable to load transactions</AlertTitle>
          <AlertDescription>{errorMsg}</AlertDescription>
        </Alert>
      </div>
    );

  /* ---------- 3. no docs yet ---------- */
  if (!docs.length)
    return (
      <p className="p-6 text-muted-foreground">
        No documents found for this client. Upload statements to see transactions.
      </p>
    );

  /* ---------- 4. ready ---------- */
  return (
    <div className="flex flex-col overflow-auto h-[calc(100vh-64px)] gap-4 p-4">
      {/* controls */}
      <div className="flex gap-4 items-end">
        <Select value={month ?? undefined} onValueChange={setMonth}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Select month" />
          </SelectTrigger>
          <SelectContent>
            {Array.from(new Set(docs.map((d) => fmtDate(d.as_of_date).slice(0, 7))))
              .sort((a, b) => (a > b ? -1 : 1))
              .map((m) => (
                <SelectItem key={m} value={m}>
                  {new Date(m + "-01").toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "short",
                  })}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>

        <Input
          placeholder="Filter transaction tables…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
      </div>

      {/* aggregated tables */}
      {visibleTitles.length === 0 ? (
        <Card className="p-4 text-center text-sm text-muted-foreground mt-10">
          <CardHeader className="pb-0">
            <CardTitle>No data to display</CardTitle>
            <CardDescription>Select a different month or upload statements.</CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="space-y-8 mt-6">
          {visibleTitles.map((title) => (
            <DataTable key={title} title={title} rows={aggregated[title]} />
          ))}
        </div>
      )}
    </div>
  );
}
