"use client";

import { useRef, useState } from "react";
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
import { MOCK_UI, USE_MOCKS } from "@/lib/dev-logger"; // ← mock styling helper

/* ----------------------- Types & helpers ----------------------- */
type StatementRow = {
  id: string;
  name: string;        // filename with extension
  period: string;      // e.g., "2025-01" or "Q1 2025"
  uploadedAt: string;  // YYYY-MM-DD
  size: string;        // human-readable
  uploader: string;
};

const mockRows: StatementRow[] = [
  {
    id: crypto.randomUUID(),
    name: "Portfolio Statement Q1.pdf",
    period: "Q1 2025",
    uploadedAt: "2025-01-10",
    size: "2.1 MB",
    uploader: "David Wilson",
  },
  {
    id: crypto.randomUUID(),
    name: "Account Summary Jan.xlsx",
    period: "2025-01",
    uploadedAt: "2025-01-12",
    size: "320 KB",
    uploader: "Ops Bot",
  },
];

function formatSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "—";
  const kb = bytes / 1024;
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
  if (e === "txt") return { Icon: FileText, cls: "bg-slate-50 text-slate-600" };
  return { Icon: FileGeneric, cls: "bg-slate-50 text-slate-600" };
}

function NameWithIcon({ name }: { name: string }) {
  const ext = (name.split(".").pop() || "").toLowerCase();
  const { Icon, cls } = fileIconForExt(ext);
  return (
    <div className="flex items-center gap-2">
      <span className={`inline-flex items-center justify-center rounded p-1.5 ${cls}`}>
        <Icon className="h-4 w-4" />
      </span>
      <span className="text-primary hover:underline cursor-pointer">{name}</span>
    </div>
  );
}
/* -------------------------------------------------------------- */

export default function StatementPage() {
  const [rows, setRows] = useState<StatementRow[]>(mockRows);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const onUploadClick = () => fileInputRef.current?.click();

  const onFilesChosen: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const name = file.name;
    const today = new Date();
    const uploadedAt = today.toISOString().slice(0, 10);
    const size = formatSize(file.size);
    // Heuristic period: current year-month
    const ym = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;

    setRows((curr) => [
      {
        id: crypto.randomUUID(),
        name,
        period: ym,
        uploadedAt,
        size,
        uploader: "You",
      },
      ...curr,
    ]);

    // allow re-selecting same file
    e.currentTarget.value = "";
  };

  const viewRow = (r: StatementRow) => {
    // hook up preview modal / viewer
    alert(`Viewing "${r.name}"`);
  };

  const downloadRow = (r: StatementRow) => {
    // wire to real file download if available
    alert(`Downloading "${r.name}"`);
  };

  const deleteRow = (r: StatementRow) => {
    if (!confirm(`Delete "${r.name}"?`)) return;
    setRows((curr) => curr.filter((x) => x.id !== r.id));
  };

  return (
    <Card className={MOCK_UI(USE_MOCKS)}>
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
        {rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <FolderOpen className="h-10 w-10 mb-2" />
            <div>No Data</div>
          </div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40%]">Name</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>Upload Date</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead>Upload User</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>
                      <NameWithIcon name={r.name} />
                    </TableCell>
                    <TableCell>{r.period}</TableCell>
                    <TableCell>{r.uploadedAt}</TableCell>
                    <TableCell>{r.size}</TableCell>
                    <TableCell>{r.uploader}</TableCell>
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
