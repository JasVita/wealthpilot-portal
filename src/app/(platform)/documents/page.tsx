"use client";

import { useState, useEffect, Fragment } from "react";
import axios from "axios";
import { useDocStore } from "@/stores/doc-store"; // ← IDs persisted locally
import type { docid } from "@/types";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Download, FileText } from "lucide-react";
import { DataTable } from "./data-table";
import { useWealthStore } from "@/stores/wealth-store";

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

/* ---------- API-level types ---------- */
interface PortfolioDocument {
  doc_key: string; // ← Dynamo primary key (for Dialog title)
  bank_name: string;
  pdf_urls: string; // ← MUST be returned by /api/get-documents
  excel_report_url?: string;
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
  const { uploadBatches } = useWealthStore();

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
        const { data } = await axios.post<{
          items: (PortfolioDocument | null)[];
        }>("/api/get-documents", { keys: docids });
        const fetchedDocs = data.items.filter(Boolean) as PortfolioDocument[];

        const merged = fetchedDocs.map((doc, idx) => {
          const batch = uploadBatches?.[idx]; // may be undefined
          const pdfFromBatch = Array.isArray(batch?.urls) ? batch.urls[0] : "";

          return {
            ...doc,
            bank_name: batch?.bankTags?.[0] ?? doc.bank_name ?? "",
            pdf_urls: pdfFromBatch,
          };
        });

        setDocs(merged);
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
                  <span className="truncate">{doc.bank_name || doc.doc_key || `Document ${idx + 1}`}</span>
                </Button>
              </DialogTrigger>

              {/* ----------- DIALOG CONTENT ----------- */}
              <DialogContent className="w-[calc(100%-40px)] h-[calc(100%-40px)] py-10 overflow-auto max-w-none sm:max-w-screen-2xl">
                <div className="flex justify-end mb-4 px-4">
                  <Button
                    variant="outline"
                    size="lg"
                    className="gap-2"
                    onClick={() => doc.excel_report_url && window.open(doc.excel_report_url)}
                    disabled={!doc.excel_report_url}
                  >
                    <Download className="h-4 w-4" />
                    Download Excel
                  </Button>
                </div>

                <DialogHeader className="p-4 hidden">
                  <DialogTitle className="truncate">{doc.bank_name}</DialogTitle>
                </DialogHeader>

                {/* ---------- SPLIT VIEW ---------- */}
                <div className="flex w-full h-[calc(100%-4rem)]">
                  {/* LEFT – PDF(s) */}
                  <div className="w-1/2 px-2 overflow-auto flex flex-col gap-10">
                    <div className="flex flex-col flex-1">
                      <span className="mb-2 text-xl font-semibold">{doc.bank_name}</span>
                      <iframe
                        src={buildPdfSrc(doc.pdf_urls)}
                        className="flex-1 w-full border-0 bg-white"
                        allowFullScreen
                      />
                    </div>
                  </div>

                  {/* RIGHT – ASSETS & TRANSACTIONS TABLES */}
                  <div className="w-1/2 px-2 overflow-auto space-y-6">
                    {/* ---------- ASSETS ---------- */}
                    {!!doc.assets && (
                      <>
                        <h3 className="text-base font-semibold">Assets</h3>
                        {Object.entries(doc.assets).map(([section, obj]) => (
                          <DataTable key={section} title={section.replace(/_/g, " ")} rows={firstArray(obj)} />
                        ))}
                      </>
                    )}

                    {/* ---------- TRANSACTIONS ---------- */}
                    {!!doc.transactions && (
                      <>
                        <h3 className="text-base font-semibold">Transactions</h3>
                        {Object.entries(doc.transactions).flatMap(([txType, txObj]) =>
                          Object.entries(txObj as Record<string, unknown>).map(([subKey, arr]) => (
                            <DataTable
                              key={`${txType}-${subKey}`}
                              title={`${txType} — ${subKey}`}
                              rows={firstArray(arr)}
                            />
                          ))
                        )}
                      </>
                    )}
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          ))}
        </div>
      )}
    </main>
  );
}
