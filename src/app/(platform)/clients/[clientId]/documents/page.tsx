// src/app/(platform)/clients/[clientId]/documents/page.tsx
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useClientStore } from "@/stores/clients-store";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Download,
  FileText,
  FileSpreadsheet,
  FileImage,
  File,
  Landmark,
  Building2,
  Signature,
  FolderOpenDot,
  IdCard,
  FileCheck2,
} from "lucide-react";
import clsx from "clsx";
import axios from "axios";
import DeleteButton from "./delete-button";

export interface Doc {
  id: string | number;
  bankname?: string;
  account_number?: string | null;
  as_of_date?: string | null;
  pdf_url?: string | null;
  excel_url?: string | null;
  name?: string;
  exp?: string | null;
  assets?: any;
  transactions?: any;
  createdAt?: string | null;
}

/* ---------- column widths (fixed layout) ---------- */
const COL = {
  bank:   "min-w-[120px] w-[160px]",
  acct:   "min-w-[120px] w-[160px]",
  name:   "min-w-[340px] w-[420px]",
  asof:   "min-w-[120px] w-[120px]",
  upload: "min-w-[120px] w-[120px]",
  acts:   "min-w-[96px]  w-[96px]",
} as const;

/* -------------------- icons -------------------- */
function FileTypeIcon({ filename }: { filename: string }) {
  const ext = (filename.split(".").pop() || "").toLowerCase();
  let Icon: any = File,
    color = "text-slate-600",
    bg = "bg-slate-100";

  switch (ext) {
    case "pdf":  Icon = FileText;        color = "text-red-600";    bg = "bg-red-50";    break;
    case "doc":
    case "docx": Icon = FileText;        color = "text-blue-600";   bg = "bg-blue-50";   break;
    case "xls":
    case "xlsx":
    case "csv":  Icon = FileSpreadsheet; color = "text-green-600";  bg = "bg-green-50";  break;
    case "jpg":
    case "jpeg":
    case "png":
    case "gif":
    case "webp": Icon = FileImage;       color = "text-purple-600"; bg = "bg-purple-50"; break;
  }

  return (
    <span className={clsx("inline-flex h-6 w-6 items-center justify-center rounded", bg)}>
      <Icon className={clsx("h-4 w-4", color)} />
    </span>
  );
}

/* -------------------- helpers -------------------- */
function fileNameFromUrl(url?: string | null) {
  if (!url) return "";
  try {
    const p = new URL(url).pathname;
    const last = p.split("/").pop() || "";
    return decodeURIComponent(last);
  } catch {
    const last = url.split("/").pop() || "";
    return decodeURIComponent(last);
  }
}

function displayName(d: Partial<Doc>) {
  if (d?.name) return d.name;
  if (d?.bankname || d?.as_of_date) {
    const dt = d?.as_of_date ? new Date(d.as_of_date) : null;
    const ymd = dt && !isNaN(+dt) ? dt.toISOString().slice(0, 10) : "";
    return [d?.bankname, ymd].filter(Boolean).join(" — ") || `Document ${d?.id ?? ""}`;
  }
  return fileNameFromUrl(d?.pdf_url) || fileNameFromUrl(d?.excel_url) || `Document ${d?.id ?? ""}`;
}

/** Name cell with *true* 2-line clamp + ellipsis */
function NameCell({ filename, href }: { filename: string; href?: string }) {
  const ClampClasses =
    // allow wrapping, then clamp to 2 lines and hide overflow
    "min-w-0 whitespace-normal break-words leading-snug " +
    "[display:-webkit-box] [-webkit-line-clamp:2] [-webkit-box-orient:vertical] " +
    "overflow-hidden";

  return (
    <div className="flex items-start gap-2 min-w-0">
      <FileTypeIcon filename={filename} />
      <div className="min-w-0 flex-1">
        {href ? (
          <Link
            href={href}
            prefetch={false}
            title={filename}
            className={clsx("block text-primary hover:underline", ClampClasses)}
          >
            {filename}
          </Link>
        ) : (
          <span title={filename} className={clsx("block", ClampClasses)}>
            {filename}
          </span>
        )}
      </div>
    </div>
  );
}

/* -------------------- folders -------------------- */
type FolderKey =
  | "all"
  | "personal_info"
  | "mandate"
  | "kyc"
  | "client_signature"
  | "trust"
  | "statements"
  | "corporate_docs"
  | "others";

const FOLDERS: { key: FolderKey; label: string; icon: any }[] = [
  { key: "all", label: "All", icon: FolderOpenDot },
  { key: "personal_info", label: "Personal Info", icon: IdCard },
  { key: "mandate", label: "Mandate", icon: FileCheck2 },
  { key: "kyc", label: "KYC", icon: Signature },
  { key: "client_signature", label: "Client Signature", icon: Signature },
  { key: "trust", label: "Trust", icon: Landmark },
  { key: "statements", label: "Statements", icon: FileSpreadsheet },
  { key: "corporate_docs", label: "Corporate Docs", icon: Building2 },
  { key: "others", label: "Others", icon: FolderOpenDot },
];

function resolveFolder(_d: Doc): FolderKey {
  return "statements";
}

/* -------------------- page -------------------- */
export default function DocumentsPage() {
  const { setCurrClient, currClient } = useClientStore();

  const [docs, setDocs] = useState<Doc[]>([]);
  const [loading, setLoading] = useState(true);
  const [folder, setFolder] = useState<FolderKey>("all");
  const [q, setQ] = useState("");

  useEffect(() => {
    if (currClient) setCurrClient(currClient);
  }, [currClient, setCurrClient]);

  useEffect(() => {
    async function fetchDocs() {
      try {
        setLoading(true);
        const { data } = await axios.post<{ status: string; documents: Doc[] }>(
          "/api/clients/documents",
          { client_id: currClient }
        );
        setDocs(data.documents || []);
      } catch (err) {
        console.error("Failed to fetch documents", err);
        setDocs([]);
      } finally {
        setLoading(false);
      }
    }
    if (currClient) fetchDocs();
  }, [currClient]);

  const docsWithFolder = useMemo(
    () => docs.map((doc) => ({ ...doc, __folder: resolveFolder(doc) })),
    [docs]
  );

  const counts = useMemo(() => {
    const c: Record<FolderKey, number> = {
      all: docsWithFolder.length,
      personal_info: 0,
      mandate: 0,
      kyc: 0,
      client_signature: 0,
      trust: 0,
      statements: 0,
      corporate_docs: 0,
      others: 0,
    };
    docsWithFolder.forEach((d: any) => (c[d.__folder as FolderKey] += 1));
    return c;
  }, [docsWithFolder]);

  const filtered = useMemo(() => {
    let rows = docsWithFolder;
    if (folder !== "all") rows = rows.filter((r: any) => r.__folder === folder);
    if (q.trim()) {
      const s = q.toLowerCase();
      rows = rows.filter((r: any) =>
        [r.bankname, r.as_of_date, r.id?.toString(), fileNameFromUrl(r.pdf_url), fileNameFromUrl(r.excel_url)]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(s)
      );
    }
    return rows as (Doc & { __folder: FolderKey })[];
  }, [docsWithFolder, folder, q]);

  return (
    <div className="p-4">
      <Card>
        <CardHeader className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <CardTitle>Documents</CardTitle>
              <CardDescription>Uploaded and generated documents</CardDescription>
            </div>
            <div className="w-64">
              <Input placeholder="Search bank, date, id, filename…" value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
          </div>

          {/* Folders: hide those with 0 (except "All") */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {FOLDERS
              .filter(({ key }) => key === "all" || (counts[key] ?? 0) > 0)
              .map(({ key, label, icon: Icon }) => {
                const active = folder === key;
                return (
                  <Button
                    key={key}
                    variant={active ? "default" : "outline"}
                    size="sm"
                    className="whitespace-nowrap"
                    onClick={() => setFolder(key)}
                  >
                    <Icon className="h-4 w-4 mr-1.5" />
                    {label}
                    <span className={clsx("ml-2 rounded px-1.5 text-xs", active ? "bg-black/10" : "bg-muted")}>
                      {counts[key]}
                    </span>
                  </Button>
                );
              })}
          </div>
        </CardHeader>

        <CardContent>
          <div className="rounded-xl border">
            <div className="overflow-auto">
              <Table className="text-sm table-fixed w-full">
                <TableHeader className="bg-background">
                  <TableRow className="hover:bg-transparent [&>th]:px-3 [&>th]:py-2 text-md text-muted-foreground">
                    <TableHead className={`${COL.bank}`}>Bank</TableHead>
                    <TableHead className={`${COL.acct}`}>Account Number</TableHead>
                    <TableHead className={`${COL.name}`}>Name</TableHead>
                    <TableHead className={`${COL.asof}`}>As Of Date</TableHead>
                    <TableHead className={`${COL.upload}`}>Upload Date</TableHead>
                    <TableHead className={`${COL.acts} text-center`}>Actions</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="px-3 py-8 text-center text-muted-foreground">
                        Loading…
                      </TableCell>
                    </TableRow>
                  ) : filtered.length > 0 ? (
                    filtered.map((d, i) => {
                      const safeFilename =
                        fileNameFromUrl(d.pdf_url) ||
                        fileNameFromUrl(d.excel_url) ||
                        (typeof d.name === "string" ? d.name : "");

                      const label = displayName(d);
                      const asOf = d.as_of_date ? new Date(d.as_of_date).toISOString().slice(0, 10) : "—";
                      const uploaded = d.createdAt ? new Date(d.createdAt).toISOString().slice(0, 10) : "—";
                      const docHref = d.id
                        ? `/clients/${encodeURIComponent(String(currClient))}/documents/${encodeURIComponent(String(d.id))}`
                        : undefined;

                      return (
                        <TableRow key={(d.id ?? i).toString()} className="border-t hover:bg-muted/40 align-top">
                          {/* Bank — 2-line clamp */}
                          <TableCell className={`${COL.bank} px-3 py-2`}>
                            <span
                              title={d.bankname ?? "—"}
                              className="block min-w-0 whitespace-normal break-words leading-snug
                                         [display:-webkit-box] [-webkit-line-clamp:2] [-webkit-box-orient:vertical]
                                         overflow-hidden"
                            >
                              {d.bankname ?? "—"}
                            </span>
                          </TableCell>

                          {/* Account Number — fixed width, single-line ellipsis */}
                          <TableCell className={`${COL.acct} px-3 py-2`}>
                            <span className="block overflow-hidden text-ellipsis whitespace-nowrap" title={d.account_number ?? "—"}>
                              {d.account_number ?? "—"}
                            </span>
                          </TableCell>

                          {/* Name — 2-line clamp with icon */}
                          <TableCell className={`${COL.name} px-3 py-2`}>
                            <NameCell filename={safeFilename || label} href={docHref} />
                          </TableCell>

                          {/* As Of Date */}
                          <TableCell className={`${COL.asof} px-3 py-2`}>
                            <span className="block overflow-hidden text-ellipsis whitespace-nowrap" title={asOf}>
                              {asOf}
                            </span>
                          </TableCell>

                          {/* Upload Date */}
                          <TableCell className={`${COL.upload} px-3 py-2`}>
                            <span className="block overflow-hidden text-ellipsis whitespace-nowrap" title={uploaded}>
                              {uploaded}
                            </span>
                          </TableCell>

                          {/* Actions */}
                          <TableCell className={`${COL.acts} px-3 py-2 text-center`}>
                            <div className="flex items-center justify-center gap-2">
                              <Button size="icon" variant="ghost" aria-label="Download" asChild>
                                <a href={d.pdf_url ?? d.excel_url ?? "#"} target="_blank" rel="noopener noreferrer">
                                  <Download className="h-4 w-4" />
                                </a>
                              </Button>
                              <DeleteButton doc={d as Doc} docs={docs} setDocs={setDocs} />
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="px-3 py-8 text-center text-muted-foreground">
                        No documents found in this folder.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
