"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { useClientStore } from "@/stores/clients-store";

import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  Upload,
  Eye,
  Download,
  Trash2,
  FolderOpen,
  File as FileGeneric,
  FileText,
  FileSpreadsheet,
  FileImage,
} from "lucide-react";

/* ----------------------- Types & helpers ----------------------- */
type StatementRow = {
  id: string;
  name: string;        // filename with extension
  period: string;      // e.g., "2025-07"
  uploadedAt: string;  // YYYY-MM-DD
  size: string;        // human-readable (— until stored)
  uploader: string;    // (— until stored)
  url?: string;        // for download/view
};

type ApiDoc = {
  id: string | number;
  pdf_url?: string | null;
  excel_url?: string | null;
  as_of_date?: string | null;   // ISO
  createdAt?: string | null;    // ISO
  bankname?: string | null;     // available if you want to display later
  account_number?: string | null;
};

function formatSize(bytes: number | undefined): string {
  if (!Number.isFinite(bytes || NaN) || (bytes ?? 0) <= 0) return "—";
  const kb = (bytes as number) / 1024;
  if (kb < 1024) return `${kb.toFixed(0)} KB`;
  const mb = kb / 1024;
  return `${mb.toFixed(1)} MB`;
}

function fileIconForExt(ext: string): { Icon: any; cls: string } {
  const e = ext.toLowerCase();
  if (e === "pdf") return { Icon: FileText, cls: "bg-red-50 text-red-600" };
  if (e === "doc" || e === "docx")
    return { Icon: FileText, cls: "bg-blue-50 text-blue-600" };
  if (e === "xls" || e === "xlsx" || e === "csv")
    return { Icon: FileSpreadsheet, cls: "bg-emerald-50 text-emerald-600" };
  if (e === "jpg" || e === "jpeg" || e === "png")
    return { Icon: FileImage, cls: "bg-violet-50 text-violet-600" };
  return { Icon: FileGeneric, cls: "bg-slate-50 text-slate-600" };
}

function fileNameFromUrl(url?: string | null): string {
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

function NameWithIcon({ name, url }: { name: string; url?: string }) {
  const ext = (name.split(".").pop() || "").toLowerCase();
  const { Icon, cls } = fileIconForExt(ext);

  // Use the full cell width for truncation; no arbitrary max-w.
  const content = (
    <span
      className="block w-full overflow-hidden text-ellipsis whitespace-nowrap"
      title={name}
    >
      {name}
    </span>
  );

  return (
    <div className="flex items-center gap-2 min-w-0">
      <span className={`inline-flex items-center justify-center rounded p-1.5 ${cls}`}>
        <Icon className="h-4 w-4" />
      </span>

      {/* This wrapper gives the anchor/span a min-w-0 context so truncate uses the whole cell */}
      <div className="min-w-0 flex-1">
        {url ? (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="block min-w-0 text-primary hover:underline"
          >
            {content}
          </a>
        ) : (
          content
        )}
      </div>
    </div>
  );
}

/** Derive "YYYY-MM" from ISO date, fallback "—" */
function periodFromIso(iso?: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(+d)) return "—";
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** Slice to "YYYY-MM-DD" */
function ymd(iso?: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(+d)) return "—";
  return d.toISOString().slice(0, 10);
}

/* -------------------------------------------------------------- */

export default function StatementPage() {
  const { currClient } = useClientStore();
  const [rows, setRows] = useState<StatementRow[]>([]);
  const [loading, setLoading] = useState(true);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Load docs for this client and map them to statement rows
  useEffect(() => {
    if (!currClient) return;

    (async () => {
      try {
        setLoading(true);
        const { data } = await axios.post<{ status: string; documents: ApiDoc[] }>(
          "/api/clients/documents",
          { client_id: currClient }
        );

        const docs = Array.isArray(data?.documents) ? data.documents : [];

        // If/when you categorize, filter to only "statements" here:
        // const statements = docs.filter(d => (d as any).__folder === 'statements')
        const mapped: StatementRow[] = docs.map((d) => {
          const url = d.pdf_url ?? d.excel_url ?? undefined;
          const name =
            fileNameFromUrl(d.pdf_url) ||
            fileNameFromUrl(d.excel_url) ||
            `Document ${d.id}`;
          return {
            id: String(d.id),
            name,
            period: periodFromIso(d.as_of_date),
            uploadedAt: ymd(d.createdAt),
            size: "—",
            uploader: "—",
            url,
          };
        });

        // Sort: by period desc then uploadedAt desc
        mapped.sort((a, b) => {
          const aKey = `${a.period} ${a.uploadedAt}`;
          const bKey = `${b.period} ${b.uploadedAt}`;
          return aKey < bKey ? 1 : aKey > bKey ? -1 : 0;
        });

        setRows(mapped);
      } catch (e) {
        console.error("[statements] fetch error", e);
        setRows([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [currClient]);

  const onUploadClick = () => fileInputRef.current?.click();

  // Keep the lightweight local upload to append a row visually
  const onFilesChosen: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const name = file.name;
    const today = new Date();
    const uploadedAt = today.toISOString().slice(0, 10);
    const ym = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;

    setRows((curr) => [
      {
        id: crypto.randomUUID(),
        name,
        period: ym,
        uploadedAt,
        size: formatSize(file.size),
        uploader: "You",
        url: undefined,
      },
      ...curr,
    ]);

    // allow re-selecting same file
    e.currentTarget.value = "";
  };

  const viewRow = (r: StatementRow) => {
    if (r.url) window.open(r.url, "_blank", "noopener,noreferrer");
  };

  const downloadRow = (r: StatementRow) => {
    if (r.url) window.open(r.url, "_blank", "noopener,noreferrer");
  };

  const deleteRow = (r: StatementRow) => {
    if (!confirm(`Delete "${r.name}"?`)) return;
    setRows((curr) => curr.filter((x) => x.id !== r.id));
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Statement</CardTitle>
          <CardDescription>Client statements uploaded or generated</CardDescription>
        </div>

        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept=".pdf,.doc,.docx,.xlsx,.xls,.csv,.txt,.jpg,.jpeg,.png"
            onChange={onFilesChosen}
          />
          <Button onClick={onUploadClick} variant="outline" size="sm">
            <Upload className="h-4 w-4 mr-2" />
            Upload Statement
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            Loading…
          </div>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <FolderOpen className="h-10 w-10 mb-2" />
            <div>No Data</div>
          </div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  {/* Name  — more room on larger screens */}
                  <TableHead className="w-[72%] md:w-[76%] lg:w-[80%]">Name</TableHead>
                  <TableHead className="w-[14%] md:w-[12%] lg:w-[10%]">Period</TableHead>
                  <TableHead className="w-[14%] md:w-[12%] lg:w-[10%]">Upload Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>


              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="min-w-0"><NameWithIcon name={r.name} url={r.url} /></TableCell>
                    <TableCell>{r.period}</TableCell>
                    <TableCell>{r.uploadedAt}</TableCell>
                    <TableCell className="text-right">
                      <div className="inline-flex items-center gap-3">
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground"
                          onClick={() => viewRow(r)}
                          title="View"
                        >
                          <Eye className="h-4 w-4" />
                          <span className="text-sm">View</span>
                        </button>
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground"
                          onClick={() => downloadRow(r)}
                          title="Download"
                        >
                          <Download className="h-4 w-4" />
                          <span className="text-sm">Download</span>
                        </button>
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground"
                          onClick={() => deleteRow(r)}
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                          <span className="text-sm">Delete</span>
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>


            </Table>

            <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
              <div>
                Showing 1 to {rows.length} of {rows.length} entries
              </div>
              <div>Page size: 10</div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
