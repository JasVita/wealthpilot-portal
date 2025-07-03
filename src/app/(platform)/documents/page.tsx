"use client";

import { useState, useEffect, Fragment } from "react";
import axios from "axios";
import { useDocStore } from "@/stores/doc-store"; // ← IDs persisted locally
import type { docid } from "@/types";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogContent2,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Download, FileText } from "lucide-react";
import { DataTable } from "./data-table";

/* ---------- helpers ---------- */
function buildPdfSrc(url: string) {
  const [base, hash] = url.split("#");
  const flags = "toolbar=0&navpanes=0&scrollbar=0&view=FitH";
  return `${base}#${hash ? `${hash}&` : ""}${flags}`;
}

const firstArray = (obj: unknown): Record<string, unknown>[] => {
  if (Array.isArray(obj)) return obj as any[];
  if (obj && typeof obj === "object") return firstArray(Object.values(obj)[0]);
  return [];
};

function applyColumnOrder<T extends Record<string, unknown>>(rows: T[], columnOrder: string[] | undefined): T[] {
  if (!columnOrder?.length) return rows; // nothing to do
  return rows.map((row) => {
    const ordered: Record<string, unknown> = {};

    /* explicit order first */
    columnOrder.forEach((key) => {
      if (key in row) ordered[key] = row[key];
    });

    /* any leftover keys come afterwards */
    Object.keys(row).forEach((k) => {
      if (!(k in ordered)) ordered[k] = row[k];
    });

    return ordered as T;
  });
}

/* ---------- API-level types ---------- */
interface PortfolioDocument {
  PK: string;
  bank_name: string;
  pdf_url: string;
  excel_report_url: string;
  assets: Record<string, unknown>;
  transactions: Record<string, unknown>;
}

/* ---------- Main page ---------- */
export default function DocumentsMergedPage() {
  const docids: docid[] = useDocStore((s) => s.docids);
  const [docs, setDocs] = useState<PortfolioDocument[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  /* Fetch (or refetch) whenever id list changes --------------- */
  useEffect(() => {
    if (!docids.length) {
      setDocs([]);
      return;
    }
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const dev = [{ PK: "doc", SK: "1751511123670_1" }];
        const { data } = await axios.post<{
          items: (PortfolioDocument | null)[];
        }>("/api/get-documents", { keys: docids });
        const fetchedDocs = data.items.filter(Boolean) as PortfolioDocument[];

        setDocs(fetchedDocs);
      } catch (e: any) {
        setError(e?.response?.data?.error ?? e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [docids]);

  /* ---------------- render states ---------------- */
  if (loading) return <p className="p-6">Loading…</p>;
  if (error) return <p className="p-6 text-red-600">Error: {error}</p>;
  if (!docs.length) return <p className="p-6 text-gray-500">No documents to display.</p>;

  /* ---------------- main UI ---------------- */
  const filtered = docs.filter((d) => (d.bank_name ?? "").toLowerCase().includes(search.toLowerCase()));

  return (
    <main className="p-6">
      {/* ---- quick search ---- */}
      <div className="mb-6 max-w-md">
        <Input placeholder="Search by bank name..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {filtered.length === 0 ? (
        <p className="text-muted-foreground">No matching documents found.</p>
      ) : (
        <div className="space-y-4">
          {filtered.map((doc, idx) => (
            <Dialog key={idx}>
              {/* ----------- ROW (dialog trigger) ----------- */}
              <DialogTrigger asChild>
                <Button variant="outline" className="w-full flex items-center gap-2 truncate">
                  <FileText className="w-5 h-5 flex-shrink-0" />
                  <span className="truncate">{doc.bank_name || doc.PK || `Document ${idx + 1}`}</span>
                </Button>
              </DialogTrigger>

              {/* ----------- DIALOG CONTENT ----------- */}
              <DialogContent2 className="">
                <Button
                  variant="outline"
                  size="lg"
                  className="gap-2 mb-4 w-1/3 mx-auto my-4"
                  onClick={() => doc.excel_report_url && window.open(doc.excel_report_url)}
                  disabled={!doc.excel_report_url}
                >
                  <Download className="h-4 w-4" />
                  Download Excel
                </Button>

                <DialogHeader className="p-4 hidden">
                  <DialogTitle className="truncate">{doc.bank_name}</DialogTitle>
                </DialogHeader>

                {/* ---------- SPLIT VIEW ---------- */}
                <div className="flex flex-1 overflow-hidden">
                  {/* ---------- LEFT – PDF ---------- */}
                  <div className="flex flex-col overflow-y-auto lg:basis-1/2 lg:pr-3 mb-6 lg:mb-0 min-w-0">
                    <span className="mb-2 text-xl font-semibold truncate">{doc.bank_name}</span>

                    {doc.pdf_url ? (
                      <iframe
                        src={buildPdfSrc(doc.pdf_url)}
                        className="flex-1 w-full border-0 bg-white"
                        allowFullScreen
                      />
                    ) : (
                      <div className="flex items-center justify-center flex-1 text-gray-500">No PDF available</div>
                    )}
                  </div>

                  {/* ---------- RIGHT – TABLES ---------- */}
                  <div className="flex flex-col overflow-y-auto lg:basis-1/2 lg:pl-3 space-y-6 min-w-0">
                    {/* ======== ASSETS ======== */}
                    {!!(doc.assets as { tableOrder: string[] })?.tableOrder?.length && (
                      <>
                        <h3 className="text-base font-semibold">Assets</h3>
                        {(doc.assets as { tableOrder: string[] }).tableOrder.map((sectionKey) => {
                          const section = (doc.assets as any)[sectionKey];
                          if (!section?.rows?.length) return null;

                          const rows = applyColumnOrder(section.rows, section.columnOrder);
                          return <DataTable key={sectionKey} title={sectionKey.replace(/_/g, " ")} rows={rows} />;
                        })}
                      </>
                    )}

                    {/* ======== TRANSACTIONS ======== */}
                    {!!(doc.transactions as { tableOrder: string[] })?.tableOrder?.length && (
                      <>
                        <h3 className="text-base font-semibold">Transactions</h3>
                        {(doc.transactions as { tableOrder: string[] }).tableOrder.map((sectionKey) => {
                          const section = (doc.transactions as any)[sectionKey];
                          if (!section?.rows?.length) return null;

                          const rows = applyColumnOrder(section.rows, section.columnOrder);
                          return <DataTable key={sectionKey} title={sectionKey.replace(/_/g, " ")} rows={rows} />;
                        })}
                      </>
                    )}
                  </div>
                </div>
              </DialogContent2>
            </Dialog>
          ))}
        </div>
      )}
    </main>
  );
}
