"use client";

import React, { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import axios from "axios";
import { toast } from "sonner";
import { useClientStore } from "@/stores/clients-store";
import { use } from "react";

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { ArrowLeft, Download, Pencil, Save, X, Link as LinkIcon, FileSpreadsheet, FileText } from "lucide-react";

import { EditableDataTable } from "@/app/(platform)/clients/documents/editable-data-table";
import type { GridApi } from "ag-grid-community";

/* ============================= Types ============================= */
export interface Doc {
  id: string;
  bankname: string;
  as_of_date: string;
  pdf_url: string | null;
  excel_url: string | null;
  // optional metadata you might have on backend; they’ll show as "—" if absent
  createdBy?: string | null;
  createdAt?: string | null;
  updatedBy?: string | null;
  updatedAt?: string | null;
  account_number?: string | null;
  bank_id?: string | number | null;

  assets?: TableRoot | null;
  transactions?: TableRoot | null;
}
type TableBlock = { columnOrder?: string[]; rows: Record<string, unknown>[] };
type SubTableGroup = { subTableOrder: string[] } & Record<string, string[] | TableBlock | any>;
type TableRoot = { tableOrder: string[] } & Record<string, SubTableGroup | TableBlock | any>;

/* ============================= Helpers ============================= */
const buildPdfSrc = (url: string) => {
  const [base, hash] = url.split("#");
  const flags = "toolbar=0&navpanes=0&scrollbar=0&view=FitH";
  return `${base}#${hash ? `${hash}&` : ""}${flags}`;
};

function applyColumnOrder<T extends Record<string, unknown>>(rows: T[], columnOrder?: string[]): T[] {
  if (!columnOrder?.length) return rows;
  return rows.map((row) => {
    const ordered: Record<string, unknown> = {};
    columnOrder.forEach((k) => k in row && (ordered[k] = row[k]));
    Object.keys(row).forEach((k) => !(k in ordered) && (ordered[k] = row[k]));
    return ordered as T;
  });
}

function fileNameFromUrl(url?: string | null) {
  if (!url) return "";
  try {
    const p = new URL(url).pathname;
    return decodeURIComponent(p.split("/").pop() || "");
  } catch {
    return decodeURIComponent((url || "").split("/").pop() || "");
  }
}

function summarizeRoot(root?: TableRoot | null) {
  const tableOrder = root?.tableOrder ?? [];
  const items = tableOrder.map((catKey) => {
    const cat = root?.[catKey] as SubTableGroup | TableBlock | undefined;
    if (!cat) return { key: catKey, type: "table", subCount: 0, rowCount: 0 };
    if ("subTableOrder" in (cat as any)) {
      const subs = (cat as SubTableGroup).subTableOrder ?? [];
      const rows = subs.reduce((a, s) => a + ((cat as any)[s]?.rows?.length ?? 0), 0);
      return { key: catKey, type: "group", subCount: subs.length, rowCount: rows };
    }
    return { key: catKey, type: "table", subCount: 0, rowCount: (cat as TableBlock)?.rows?.length ?? 0 };
  });
  const totalRows = items.reduce((a, i) => a + i.rowCount, 0);
  return { categories: tableOrder.length, items, totalRows };
}

async function fetchDocById(clientId: string, docId: string): Promise<Doc | null> {
  const { data } = await axios.post<{ status: string; documents: Doc[]; message?: string }>(
    `${process.env.NEXT_PUBLIC_API_URL}/documents`,
    { client_id: clientId }
  );
  const docs: Doc[] = data?.documents ?? [];
  return docs.find((d) => String(d.id) === String(docId)) ?? null;
}

/* ============================= Simple ShadCN Table (view mode) ============================= */
function toHeaders(rows: Record<string, any>[], columnOrder?: string[]) {
  if (columnOrder?.length) return columnOrder;
  const first = rows?.[0] ?? {};
  return Object.keys(first);
}
const isNumeric = (v: any) =>
  typeof v === "number" || (typeof v === "string" && v.trim() !== "" && !isNaN(Number(v.replaceAll(",", ""))));

function RowsTable({
  title,
  rows,
  columnOrder,
  maxHeight = 460,
}: {
  title?: string;
  rows: Record<string, any>[];
  columnOrder?: string[];
  maxHeight?: number;
}) {
  if (!rows?.length) return null;
  const headers = toHeaders(rows, columnOrder);

  return (
    <section className="space-y-2">
      {title ? <h4 className="font-semibold">{title}</h4> : null}
      <div className="rounded-md border overflow-hidden">
        <div className="w-full overflow-x-auto" style={{ maxHeight }}>
          <Table>
            <TableHeader className="sticky top-0 bg-background">
              <TableRow>
                {headers.map((h) => (
                  <TableHead key={h} className="whitespace-nowrap">
                    {h.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r, i) => (
                <TableRow key={i}>
                  {headers.map((h) => {
                    const val = r[h];
                    return (
                      <TableCell key={h} className={isNumeric(val) ? "text-right" : ""}>
                        {val ?? ""}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </section>
  );
}

/* ============================= Page ============================= */
export default function DocumentDetail(props: { params: Promise<{ clientId: string; docId: string }> }) {
  const router = useRouter();
  const { setCurrClient } = useClientStore();
  const { clientId, docId } = use(props.params);

  const [loading, setLoading] = useState(true);
  const [doc, setDoc] = useState<Doc | null>(null);

  const [mode, setMode] = useState<"view" | "edit">("view");
  const [isSaving, setIsSaving] = useState(false);

  const pristineRef = useRef<{ assets: any; transactions: any } | null>(null);
  const [editedData, setEditedData] = useState<{ assets: any; transactions: any }>({
    assets: null,
    transactions: null,
  });

  const [leftTab, setLeftTab] = useState<"info" | "assets" | "transactions">("info");
  const [assetCat, setAssetCat] = useState<string | null>(null);
  const [assetSub, setAssetSub] = useState<string | null>(null);
  const [txnCat, setTxnCat] = useState<string | null>(null);
  const [txnSub, setTxnSub] = useState<string | null>(null);

  const gridApisRef = useRef<GridApi[]>([]);
  const registerGridApi = useCallback((api: GridApi) => {
    if (!gridApisRef.current.includes(api)) gridApisRef.current.push(api);
  }, []);

  useEffect(() => {
    if (clientId) setCurrClient(clientId);
  }, [clientId, setCurrClient]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const d = await fetchDocById(clientId, docId);
        if (!mounted) return;
        if (!d) {
          toast.error("Document not found");
          router.replace(`/clients_clone/${clientId}/documents`);
          return;
        }
        setDoc(d);
        pristineRef.current = {
          assets: structuredClone(d.assets ?? null),
          transactions: structuredClone(d.transactions ?? null),
        };
        setEditedData({
          assets: structuredClone(d.assets ?? null),
          transactions: structuredClone(d.transactions ?? null),
        });

        const aFirst = d.assets?.tableOrder?.[0] ?? null;
        const tFirst = d.transactions?.tableOrder?.[0] ?? null;
        setAssetCat(aFirst);
        setTxnCat(tFirst);
        if (aFirst && "subTableOrder" in (d.assets as any)[aFirst]) {
          setAssetSub((d.assets as any)[aFirst].subTableOrder?.[0] ?? null);
        }
        if (tFirst && "subTableOrder" in (d.transactions as any)[tFirst]) {
          setTxnSub((d.transactions as any)[tFirst].subTableOrder?.[0] ?? null);
        }
      } catch (err) {
        console.error(err);
        toast.error("Failed to load document");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [clientId, docId, router]);

  const hasUnsavedChanges = useMemo(() => {
    if (mode !== "edit" || !pristineRef.current) return false;
    return JSON.stringify(editedData) !== JSON.stringify(pristineRef.current);
  }, [editedData, mode]);

  const handleTableDataChange = useCallback(
    (
      section: "assets" | "transactions",
      categoryKey: string,
      subTableKey: string | null,
      newRows: Record<string, unknown>[]
    ) => {
      setEditedData((prev) => {
        const next = structuredClone(prev);
        if (!next[section]) next[section] = {};
        if (subTableKey) {
          if (!next[section][categoryKey]) next[section][categoryKey] = { subTableOrder: [] };
          if (!next[section][categoryKey][subTableKey]) next[section][categoryKey][subTableKey] = {};
          next[section][categoryKey][subTableKey].rows = newRows;
        } else {
          if (!next[section][categoryKey]) next[section][categoryKey] = {};
          next[section][categoryKey].rows = newRows;
        }
        return next;
      });
    },
    []
  );

  const saveChanges = useCallback(async () => {
    if (!doc) return;
    setIsSaving(true);
    const toastId = toast("Saving changes…", { duration: Infinity });
    try {
      const { data } = await axios.patch<{ task_id: string }>(`${process.env.NEXT_PUBLIC_API_URL}/update_document`, {
        client_id: clientId,
        doc_id: doc.id,
        data: {
          assets: editedData.assets,
          transactions: editedData.transactions,
        },
      });

      const taskId = data.task_id;
      const poll = setInterval(async () => {
        try {
          const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/update_document/${taskId}`, {
            validateStatus: () => true,
          });
          if (res.status !== 202) {
            clearInterval(poll);
            toast.dismiss(toastId);
            setIsSaving(false);
            if (res.status === 200) {
              toast.success("Document updated successfully.");
              pristineRef.current = structuredClone(editedData);
              setMode("view");
              gridApisRef.current.forEach((api) => api.refreshCells({ force: true, suppressFlash: true }));
            } else {
              const errMsg = res.data?.error || res.statusText || "Server error";
              toast.error(`Update failed: ${errMsg}`);
            }
          }
        } catch (e) {
          console.error(e);
        }
      }, 1500);
    } catch (err: any) {
      toast.dismiss(toastId);
      setIsSaving(false);
      toast.error(err?.response?.data?.message || err?.message || "Update failed.");
    }
  }, [doc, editedData, clientId]);

  const cancelEdit = useCallback(() => {
    if (!pristineRef.current) return;
    setEditedData(structuredClone(pristineRef.current));
    setMode("view");
    gridApisRef.current.forEach((api) => api.refreshCells({ force: true, suppressFlash: true }));
  }, []);

  /* =============== helpers to render a single category/subtable =============== */
  function getCategoryBlock(root: TableRoot | null | undefined, catKey: string | null) {
    if (!root || !catKey) return null;
    return root[catKey] as SubTableGroup | TableBlock | undefined;
  }
  function getSubTableBlock(cat: SubTableGroup | TableBlock | undefined, subKey: string | null) {
    if (!cat) return null;
    if ("subTableOrder" in (cat as any)) {
      return (cat as any)[subKey ?? ""] as TableBlock | undefined;
    }
    return cat as TableBlock;
  }

  /* ============================= Left Pane ============================= */
  function LeftPane() {
    if (!doc) return null;

    const assetsSummary = summarizeRoot(doc.assets);
    const txSummary = summarizeRoot(doc.transactions);

    const renderInfo = (
      <div className="space-y-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Document</CardTitle>
            <CardDescription>
              {doc.bankname} • {doc.as_of_date ? new Date(doc.as_of_date).toISOString().slice(0, 10) : "—"}
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm">
            <div className="grid grid-cols-3 gap-y-2">
              <div className="text-muted-foreground">ID</div>
              <div className="col-span-2">{doc.id}</div>

              <div className="text-muted-foreground">Bank</div>
              <div className="col-span-2">{doc.bankname || "—"}</div>

              <div className="text-muted-foreground">Account #</div>
              <div className="col-span-2">{doc.account_number ?? "—"}</div>

              <div className="text-muted-foreground">Bank ID</div>
              <div className="col-span-2">{doc.bank_id ?? "—"}</div>

              <div className="text-muted-foreground">As-of Date</div>
              <div className="col-span-2">
                {doc.as_of_date ? new Date(doc.as_of_date).toISOString().slice(0, 10) : "—"}
              </div>

              <div className="text-muted-foreground">PDF</div>
              <div className="col-span-2 flex items-center gap-2 min-w-0">
                <FileText className="h-5 w-5 text-red-600 shrink-0" />
                {doc.pdf_url ? (
                  <a
                    href={doc.pdf_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline truncate block max-w-[180px]"
                    title={fileNameFromUrl(doc.pdf_url)}
                  >
                    {fileNameFromUrl(doc.pdf_url)}
                  </a>
                ) : (
                  "—"
                )}
              </div>

              <div className="text-muted-foreground">Excel</div>
              <div className="col-span-2 flex items-center gap-2 min-w-0">
                <FileSpreadsheet className="h-5 w-5 text-green-600 shrink-0" />
                {doc.excel_url ? (
                  <a
                    href={doc.excel_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline truncate block max-w-[180px]"
                    title={fileNameFromUrl(doc.excel_url)}
                  >
                    {fileNameFromUrl(doc.excel_url)}
                  </a>
                ) : (
                  "—"
                )}
              </div>

              <div className="text-muted-foreground">Created By</div>
              <div className="col-span-2">{doc.createdBy ?? "—"}</div>

              <div className="text-muted-foreground">Created Time</div>
              <div className="col-span-2">{doc.createdAt ?? "—"}</div>

              <div className="text-muted-foreground">Updated By</div>
              <div className="col-span-2">{doc.updatedBy ?? "—"}</div>

              <div className="text-muted-foreground">Updated Time</div>
              <div className="col-span-2">{doc.updatedAt ?? "—"}</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Structure Snapshot</CardTitle>
            <CardDescription>Quick counts of parsed tables</CardDescription>
          </CardHeader>
          <CardContent className="text-sm space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded border p-3">
                <div className="text-xs text-muted-foreground mb-1">Assets</div>
                <div className="text-sm">
                  {assetsSummary.categories} categories • {assetsSummary.totalRows} rows
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {assetsSummary.items.map((it) => (
                    <span
                      key={`a-${it.key}`}
                      className="inline-flex items-center gap-2 rounded-full border px-2 py-0.5 text-xs bg-muted/40"
                    >
                      {it.key.replace(/_/g, " ")}
                      {it.subCount ? <span className="text-muted-foreground">({it.subCount} subtables)</span> : null}
                      <span className="font-semibold">{it.rowCount}</span>
                    </span>
                  ))}
                </div>
              </div>
              <div className="rounded border p-3">
                <div className="text-xs text-muted-foreground mb-1">Transactions</div>
                <div className="text-sm">
                  {txSummary.categories} categories • {txSummary.totalRows} rows
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {txSummary.items.map((it) => (
                    <span
                      key={`t-${it.key}`}
                      className="inline-flex items-center gap-2 rounded-full border px-2 py-0.5 text-xs bg-muted/40"
                    >
                      {it.key.replace(/_/g, " ")}
                      {it.subCount ? <span className="text-muted-foreground">({it.subCount} subtables)</span> : null}
                      <span className="font-semibold">{it.rowCount}</span>
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              {doc.pdf_url && (
                <Button asChild size="sm" variant="outline">
                  <a href={doc.pdf_url} target="_blank" rel="noopener noreferrer">
                    <LinkIcon className="h-4 w-4 mr-2" /> Open PDF
                  </a>
                </Button>
              )}
              {doc.excel_url && (
                <Button asChild size="sm" variant="outline">
                  <a href={doc.excel_url} target="_blank" rel="noopener noreferrer">
                    <LinkIcon className="h-4 w-4 mr-2" /> Open Excel
                  </a>
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );

    const assetsCatBlock = getCategoryBlock(doc.assets ?? null, assetCat);
    const assetsIsGroup = assetsCatBlock && "subTableOrder" in (assetsCatBlock as any);
    const assetsSubChoices: string[] = assetsIsGroup ? (assetsCatBlock as SubTableGroup).subTableOrder ?? [] : [];

    const renderAssets = (
      <div className="space-y-4">
        {doc.assets?.tableOrder?.length ? (
          <div className="rounded-md border p-2">
            <div className="text-xs text-muted-foreground mb-2">Asset Classes</div>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {doc.assets.tableOrder.map((k) => (
                <Button
                  key={k}
                  size="sm"
                  variant={assetCat === k ? "default" : "outline"}
                  className="whitespace-nowrap"
                  onClick={() => {
                    setAssetCat(k);
                    if ("subTableOrder" in (doc.assets as any)[k]) {
                      const first = (doc.assets as any)[k].subTableOrder?.[0] ?? null;
                      setAssetSub(first);
                    } else {
                      setAssetSub(null);
                    }
                  }}
                >
                  {k.replace(/_/g, " ")}
                </Button>
              ))}
            </div>

            {assetsIsGroup && assetsSubChoices.length > 0 && (
              <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
                {assetsSubChoices.map((sk) => (
                  <Button
                    key={sk}
                    size="sm"
                    variant={assetSub === sk ? "default" : "outline"}
                    className="whitespace-nowrap"
                    onClick={() => setAssetSub(sk)}
                  >
                    {sk.replace(/_/g, " ")}
                  </Button>
                ))}
              </div>
            )}
          </div>
        ) : null}

        {(() => {
          const block = getSubTableBlock(assetsCatBlock ?? undefined, assetSub);
          if (!block?.rows?.length) return <div className="text-sm text-muted-foreground">No data.</div>;
          const rows = applyColumnOrder(block.rows, block.columnOrder);
          return mode === "edit" ? (
            <EditableDataTable
              title={(assetSub ?? assetCat ?? "Assets").replace(/_/g, " ")}
              rows={rows}
              onDataChange={(newRows) => handleTableDataChange("assets", assetCat ?? "unknown", assetSub, newRows)}
              onApiReady={registerGridApi}
            />
          ) : (
            <RowsTable
              title={(assetSub ?? assetCat ?? "Assets").replace(/_/g, " ")}
              rows={rows}
              columnOrder={block.columnOrder}
            />
          );
        })()}
      </div>
    );

    const txCatBlock = getCategoryBlock(doc.transactions ?? null, txnCat);
    const txIsGroup = txCatBlock && "subTableOrder" in (txCatBlock as any);
    const txSubChoices: string[] = txIsGroup ? (txCatBlock as SubTableGroup).subTableOrder ?? [] : [];

    const renderTx = (
      <div className="space-y-4">
        {doc.transactions?.tableOrder?.length ? (
          <div className="rounded-md border p-2">
            <div className="text-xs text-muted-foreground mb-2">Transaction Classes</div>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {doc.transactions.tableOrder.map((k) => (
                <Button
                  key={k}
                  size="sm"
                  variant={txnCat === k ? "default" : "outline"}
                  className="whitespace-nowrap"
                  onClick={() => {
                    setTxnCat(k);
                    if ("subTableOrder" in (doc.transactions as any)[k]) {
                      const first = (doc.transactions as any)[k].subTableOrder?.[0] ?? null;
                      setTxnSub(first);
                    } else {
                      setTxnSub(null);
                    }
                  }}
                >
                  {k.replace(/_/g, " ")}
                </Button>
              ))}
            </div>

            {txIsGroup && txSubChoices.length > 0 && (
              <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
                {txSubChoices.map((sk) => (
                  <Button
                    key={sk}
                    size="sm"
                    variant={txnSub === sk ? "default" : "outline"}
                    className="whitespace-nowrap"
                    onClick={() => setTxnSub(sk)}
                  >
                    {sk.replace(/_/g, " ")}
                  </Button>
                ))}
              </div>
            )}
          </div>
        ) : null}

        {(() => {
          const block = getSubTableBlock(txCatBlock ?? undefined, txnSub);
          if (!block?.rows?.length) return <div className="text-sm text-muted-foreground">No data.</div>;
          const rows = applyColumnOrder(block.rows, block.columnOrder);
          return mode === "edit" ? (
            <EditableDataTable
              title={(txnSub ?? txnCat ?? "Transactions").replace(/_/g, " ")}
              rows={rows}
              onDataChange={(newRows) => handleTableDataChange("transactions", txnCat ?? "unknown", txnSub, newRows)}
              onApiReady={registerGridApi}
            />
          ) : (
            <RowsTable
              title={(txnSub ?? txnCat ?? "Transactions").replace(/_/g, " ")}
              rows={rows}
              columnOrder={block.columnOrder}
            />
          );
        })()}
      </div>
    );

    return (
      <div className="flex flex-col h-full min-h-0">
        {/* Sticky tabs */}
        <div className="sticky top-0 z-10 bg-background/90 backdrop-blur border-b">
          <div className="px-2 py-2">
            <Tabs value={leftTab} onValueChange={(v) => setLeftTab(v as any)} className="w-full">
              <TabsList className="grid grid-cols-3 w-full sm:w-auto sm:inline-grid">
                <TabsTrigger value="info">Info</TabsTrigger>
                <TabsTrigger value="assets" disabled={!doc.assets?.tableOrder?.length}>
                  Assets
                </TabsTrigger>
                <TabsTrigger value="transactions" disabled={!doc.transactions?.tableOrder?.length}>
                  Transactions
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 min-h-0 overflow-y-auto p-2 space-y-4">
          {leftTab === "info" && renderInfo}
          {leftTab === "assets" && renderAssets}
          {leftTab === "transactions" && renderTx}
        </div>
      </div>
    );
  }

  /* ============================= Render ============================= */
  if (loading) {
    return <div className="p-4 text-sm text-muted-foreground">Loading document…</div>;
  }

  if (!doc) {
    return (
      <div className="p-4">
        <Button asChild variant="ghost" size="sm">
          <Link href={`/clients_clone/${clientId}/documents`}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Back to Documents
          </Link>
        </Button>
        <div className="mt-4 text-sm text-muted-foreground">Document not found.</div>
      </div>
    );
  }

  return (
    // Fill viewport height minus any top app bar (64px); adjust if your header differs.
    <div className="flex flex-col h-[calc(100dvh-64px)] gap-4 p-4">
      {/* Top bar */}
      <div className="flex items-center justify-between shrink-0">
        <Button asChild variant="ghost" size="sm">
          <Link href={`/clients_clone/${clientId}/documents`}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Documents
          </Link>
        </Button>

        <div className="flex items-center gap-2">
          {mode === "view" ? (
            <Button variant="outline" size="sm" onClick={() => setMode("edit")}>
              <Pencil className="h-4 w-4 mr-2" />
              Edit
            </Button>
          ) : (
            <>
              <Button size="sm" onClick={saveChanges} disabled={isSaving}>
                {isSaving ? (
                  <>
                    <Save className="h-4 w-4 mr-2 animate-pulse" />
                    Saving…
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save changes
                  </>
                )}
              </Button>
              <Button variant="outline" size="sm" onClick={cancelEdit} disabled={isSaving}>
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
            </>
          )}

          <a href={doc.excel_url || doc.pdf_url || "#"} download className="inline-flex">
            <Button variant="outline" size="sm" disabled={!doc.excel_url && !doc.pdf_url}>
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
          </a>
        </div>
      </div>

      {/* Two-column resizable — fills the rest */}
      <div className="flex-1 min-h-0">
        <ResizablePanelGroup direction="horizontal" className="h-full">
          {/* LEFT (scrolls independently) */}
          <ResizablePanel defaultSize={50} minSize={30} className="min-h-0">
            <LeftPane />
          </ResizablePanel>

          <ResizableHandle withHandle />

          {/* RIGHT (PDF) */}
          <ResizablePanel defaultSize={50} minSize={30} className="min-h-0">
            <Card className="h-full">
              <CardHeader className="pb-2">
                <CardTitle>Preview</CardTitle>
                <CardDescription>PDF preview on the right</CardDescription>
              </CardHeader>
              <CardContent className="h-[calc(100%-4rem)]">
                {doc.pdf_url ? (
                  <iframe
                    src={buildPdfSrc(doc.pdf_url)}
                    className="w-full h-full border rounded bg-white"
                    allowFullScreen
                  />
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                    No PDF available
                  </div>
                )}
              </CardContent>
            </Card>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>

      {mode === "edit" && hasUnsavedChanges && (
        <div className="text-xs text-amber-600">You have unsaved changes. Click “Save changes” or “Cancel”.</div>
      )}
    </div>
  );
}
