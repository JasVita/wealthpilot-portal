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

// ⬇️ import the SAME components you used before
// import DocDialog from "./doc-dialog"
import DeleteButton from "./delete-button";

// If you already have a Doc type, keep using it.
// Otherwise this shape matches your API.
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
}

/* -------------------- icons -------------------- */
function FileTypeIcon({ filename }: { filename: string }) {
  const ext = (filename.split(".").pop() || "").toLowerCase();
  let Icon: any = File,
    color = "text-slate-600",
    bg = "bg-slate-100";

  switch (ext) {
    case "pdf":
      Icon = FileText;
      color = "text-red-600";
      bg = "bg-red-50";
      break;
    case "doc":
    case "docx":
      Icon = FileText;
      color = "text-blue-600";
      bg = "bg-blue-50";
      break;
    case "xls":
    case "xlsx":
    case "csv":
      Icon = FileSpreadsheet;
      color = "text-green-600";
      bg = "bg-green-50";
      break;
    case "jpg":
    case "jpeg":
    case "png":
    case "gif":
    case "webp":
      Icon = FileImage;
      color = "text-purple-600";
      bg = "bg-purple-50";
      break;
    default:
      Icon = File;
      color = "text-slate-600";
      bg = "bg-slate-100";
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
  // You currently bucket everything into statements.
  return "statements";
}

function daysTo(dateStr?: string | null) {
  if (!dateStr || dateStr === "—") return Infinity;
  const d = new Date(dateStr);
  if (isNaN(+d)) return Infinity;
  const ms = d.getTime() - Date.now();
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
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

  // fetch documents from API
  useEffect(() => {
    async function fetchDocs() {
      try {
        setLoading(true);
        const { data } = await axios.post<{
          status: string;
          documents: Doc[];
          message: string;
        }>(`${process.env.NEXT_PUBLIC_API_URL}/documents`, {
          client_id: currClient,
        });
        setDocs(data.documents || []);
      } catch (err) {
        console.error("Failed to fetch documents", err);
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

          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {FOLDERS.map(({ key, label, icon: Icon }) => {
              const disabled = key !== "all" && counts[key] === 0;
              const active = folder === key;
              return (
                <Button
                  key={key}
                  variant={active ? "default" : "outline"}
                  size="sm"
                  className={clsx("whitespace-nowrap", disabled && "opacity-50 pointer-events-none")}
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
          <div className="rounded-md border overflow-hidden">
            <Table>
              <TableHeader className="sticky top-0 bg-background">
                <TableRow>
                  <TableHead>Bank</TableHead>
                  <TableHead>Account Number</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>As Of Date</TableHead>
                  <TableHead>Upload Date</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead>Upload User</TableHead>
                  <TableHead className="text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      Loading documents...
                    </TableCell>
                  </TableRow>
                ) : filtered.length > 0 ? (
                  filtered.map((d, i) => {
                    const d2 = daysTo(d.exp ?? "—");
                    const expBadge =
                      !d.exp || d.exp === "—" ? null : d2 <= 0 ? (
                        <span className="ml-2 text-xs text-red-600">Expired</span>
                      ) : d2 <= 30 ? (
                        <span className="ml-2 text-xs text-amber-600">Expiring in {d2}d</span>
                      ) : null;

                    const safeFilename =
                      fileNameFromUrl(d.pdf_url) ||
                      fileNameFromUrl(d.excel_url) ||
                      (typeof d.name === "string" ? d.name : "");

                    const label = displayName(d);

                    return (
                      <TableRow key={(d.id ?? i).toString()}>
                        <TableCell>{d.bankname ?? "—"}</TableCell>
                        <TableCell>{d.account_number ?? "—"}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <FileTypeIcon filename={safeFilename} />
                            <Link
                              href={`/clients_clone/${encodeURIComponent(
                                String(currClient)
                              )}/documents/${encodeURIComponent(String(d.id ?? label))}`}
                              className="text-primary hover:underline"
                              title={safeFilename}
                            >
                              {safeFilename || label}
                            </Link>
                          </div>
                        </TableCell>
                        <TableCell>
                          {d.as_of_date ? new Date(d.as_of_date).toISOString().slice(0, 10) : "—"}
                        </TableCell>
                        <TableCell>
                          {d.exp ?? "—"}
                          {expBadge}
                        </TableCell>
                        <TableCell>{"—"}</TableCell>
                        <TableCell>{"—"}</TableCell>

                        {/* ⬇️ Make Actions behave like the old grid: DocDialog + DeleteButton */}
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-2">
                            {/* View / Edit handled internally by DocDialog (same as before) */}
                            {/* <DocDialog doc={d as Doc} mode="view" /> */}

                            {/* Download keeps your existing logic */}
                            <Button size="icon" variant="ghost" aria-label="Download" asChild>
                              <a href={d.pdf_url ?? d.excel_url ?? "#"} target="_blank" rel="noopener noreferrer">
                                <Download className="h-4 w-4" />
                              </a>
                            </Button>

                            {/* Delete uses the same DeleteButton as old code */}
                            <DeleteButton doc={d as Doc} docs={docs} setDocs={setDocs} />
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                      No documents found in this folder.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
