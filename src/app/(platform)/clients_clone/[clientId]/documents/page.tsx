"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useClientStore } from "@/stores/clients-store";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Eye, Download, Trash2, FileText, FileSpreadsheet, FileImage, File, ShieldCheck,
  Landmark, Building2, Signature, FolderOpenDot, IdCard, FileCheck2
} from "lucide-react";
import clsx from "clsx";
import { MOCK_UI, USE_MOCKS } from "@/lib/dev-logger"; // ← mock styling helper

// ✅ use the shared mock data & type (no local DOCS anymore)
import { MOCK_DOCS, Doc } from "@/lib/mock-docs";

/* ------------------------------------------------------------------ */
/* File-type icon helper                                               */
/* ------------------------------------------------------------------ */
function FileTypeIcon({ filename }: { filename: string }) {
  const ext = (filename.split(".").pop() || "").toLowerCase();
  let Icon: any = File, color = "text-slate-600", bg = "bg-slate-100";

  switch (ext) {
    case "pdf": Icon = FileText; color = "text-red-600"; bg = "bg-red-50"; break;
    case "doc":
    case "docx": Icon = FileText; color = "text-blue-600"; bg = "bg-blue-50"; break;
    case "xls":
    case "xlsx": Icon = FileSpreadsheet; color = "text-green-600"; bg = "bg-green-50"; break;
    case "csv": Icon = FileSpreadsheet; color = "text-emerald-600"; bg = "bg-emerald-50"; break;
    case "jpg":
    case "jpeg":
    case "png":
    case "gif":
    case "webp": Icon = FileImage; color = "text-purple-600"; bg = "bg-purple-50"; break;
    case "txt": Icon = FileText; color = "text-slate-700"; bg = "bg-slate-100"; break;
    default: Icon = File; color = "text-slate-600"; bg = "bg-slate-100";
  }

  return (
    <span className={clsx("inline-flex h-6 w-6 items-center justify-center rounded", bg)}>
      <Icon className={clsx("h-4 w-4", color)} />
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Folder classification                                               */
/* ------------------------------------------------------------------ */
type FolderKey =
  | "all" | "personal_info" | "mandate" | "kyc" | "client_signature"
  | "trust" | "statements" | "corporate_docs" | "others";

const FOLDERS: { key: FolderKey; label: string; icon: any }[] = [
  { key: "all",              label: "All",              icon: FolderOpenDot },
  { key: "personal_info",    label: "Personal Info",    icon: IdCard },
  { key: "mandate",          label: "Mandate",          icon: FileCheck2 },
  { key: "kyc",              label: "KYC",              icon: ShieldCheck },
  { key: "client_signature", label: "Client Signature", icon: Signature },
  { key: "trust",            label: "Trust",            icon: Landmark },
  { key: "statements",       label: "Statements",       icon: FileSpreadsheet },
  { key: "corporate_docs",   label: "Corporate Docs",   icon: Building2 },
  { key: "others",           label: "Others",           icon: FolderOpenDot },
];

// map your records into folders (adjust as needed)
function resolveFolder(d: Doc): FolderKey {
  const name = `${d.name} ${d.linked} ${d.type}`.toLowerCase();
  if (d.type === "Personal" || name.includes("kyc")) return "personal_info";
  if (name.includes("mandate")) return "mandate";
  if (name.includes("kyc")) return "kyc";
  if (name.includes("signature")) return "client_signature";
  if (name.includes("trust")) return "trust";
  if (d.type === "Statement" || name.includes("statement") || name.includes("report")) return "statements";
  if (name.includes("corporate")) return "corporate_docs";
  return "others";
}

function daysTo(dateStr: string) {
  if (!dateStr || dateStr === "—") return Infinity;
  const d = new Date(dateStr);
  if (isNaN(+d)) return Infinity;
  const ms = d.getTime() - Date.now();
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

/* ------------------------------------------------------------------ */

export default function DocumentsPage({ params }: { params: { clientId: string } }) {
  const { setCurrClient } = useClientStore();
  const [folder, setFolder] = useState<FolderKey>("all");
  const [q, setQ] = useState("");

  useEffect(() => {
    if (params.clientId) setCurrClient(params.clientId);
  }, [params.clientId, setCurrClient]);

  // attach folder to each doc
  const docsWithFolder = useMemo(
    () => MOCK_DOCS.map((doc) => ({ ...doc, __folder: resolveFolder(doc) })),
    []
  );

  const counts = useMemo(() => {
    const c: Record<FolderKey, number> = {
      all: docsWithFolder.length, personal_info: 0, mandate: 0, kyc: 0, client_signature: 0,
      trust: 0, statements: 0, corporate_docs: 0, others: 0,
    };
    docsWithFolder.forEach((d: any) => (c[d.__folder as FolderKey] += 1));
    return c;
  }, [docsWithFolder]);

  const filtered = useMemo(() => {
    let rows = docsWithFolder;
    if (folder !== "all") rows = rows.filter((r: any) => r.__folder === folder);
    if (q.trim()) {
      const s = q.toLowerCase();
      rows = rows.filter(r =>
        `${r.type} ${r.linked} ${r.name} ${r.user}`.toLowerCase().includes(s)
      );
    }
    return rows;
  }, [docsWithFolder, folder, q]);

  return (
    <div className="p-4">
      <Card className={MOCK_UI(USE_MOCKS)}>
        <CardHeader className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <CardTitle>Documents</CardTitle>
              <CardDescription>Uploaded and generated documents</CardDescription>
            </div>
            <div className="w-64">
              <Input
                placeholder="Search name, linked, user…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>
          </div>

          {/* Folder chips */}
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
                  <span
                    className={clsx(
                      "ml-2 rounded px-1.5 text-xs",
                      active ? "bg-black/10" : "bg-muted"
                    )}
                  >
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
                  <TableHead>Type</TableHead>
                  <TableHead>Linked</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Expiration Date</TableHead>
                  <TableHead>Upload Date</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead>Upload User</TableHead>
                  <TableHead className="text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {filtered.map((d: Doc & { __folder: FolderKey }, i) => {
                  const d2 = daysTo(d.exp);
                  const expBadge =
                    d.exp === "—"
                      ? null
                      : d2 <= 0
                        ? <span className="ml-2 text-xs text-red-600">Expired</span>
                        : d2 <= 30
                          ? <span className="ml-2 text-xs text-amber-600">Expiring in {d2}d</span>
                          : null;

                  return (
                    <TableRow key={d.id ?? i}>
                      <TableCell>{d.type}</TableCell>
                      <TableCell>{d.linked}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <FileTypeIcon filename={d.name} />
                          {/* ✅ Name links to details page */}
                          <Link
                            href={`/clients_clone/${params.clientId}/documents/${encodeURIComponent((d as any).id ?? d.name)}`}
                            className="text-primary hover:underline"
                            title={d.name}
                          >
                            {d.name}
                          </Link>
                        </div>
                      </TableCell>
                      <TableCell>{d.exp}{expBadge}</TableCell>
                      <TableCell>{d.upload}</TableCell>
                      <TableCell>{d.size}</TableCell>
                      <TableCell>{d.user}</TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-2">
                          <Button size="icon" variant="ghost" aria-label="Preview"><Eye className="h-4 w-4" /></Button>
                          <Button size="icon" variant="ghost" aria-label="Download"><Download className="h-4 w-4" /></Button>
                          <Button size="icon" variant="ghost" aria-label="Delete"><Trash2 className="h-4 w-4" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}

                {filtered.length === 0 && (
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
