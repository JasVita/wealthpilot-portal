"use client";

import { useRef, useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Upload,
  Share2,
  Trash2,
  File as FileGeneric,
  FileText,
  FileSpreadsheet,
  FileImage,
} from "lucide-react";

type ReportRow = {
  id: string;
  name: string;       // filename with extension
  uploadedAt: string; // YYYY-MM-DD
  uploader: string;
  status: "Client Unread" | "Read";
};

const initialRows: ReportRow[] = [
  { id: crypto.randomUUID(), name: "aa文件新建aa.docx", uploadedAt: "2025-01-15", uploader: "RM Demo", status: "Client Unread" },
  { id: crypto.randomUUID(), name: "aa文件新建aa.docx", uploadedAt: "2025-01-15", uploader: "RM Demo", status: "Client Unread" },
];

/* ---------- File icon just like the Documents tab ---------- */
function fileIconForExt(ext: string): { Icon: any; cls: string } {
  const e = ext.toLowerCase();
  if (e === "pdf") return { Icon: FileText, cls: "bg-red-50 text-red-600" };
  if (e === "doc" || e === "docx") return { Icon: FileText, cls: "bg-blue-50 text-blue-600" };
  if (e === "xls" || e === "xlsx" || e === "csv") return { Icon: FileSpreadsheet, cls: "bg-emerald-50 text-emerald-600" };
  if (e === "jpg" || e === "jpeg" || e === "png") return { Icon: FileImage, cls: "bg-violet-50 text-violet-600" };
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
/* ---------------------------------------------------------- */

export default function ReportPage() {
  const [rows, setRows] = useState<ReportRow[]>(initialRows);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const onUploadClick = () => fileInputRef.current?.click();

  const onFilesChosen: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const name = file.name;
    const today = new Date();
    const uploadedAt = today.toISOString().slice(0, 10);
    setRows((r) => [{ id: crypto.randomUUID(), name, uploadedAt, uploader: "You", status: "Client Unread" }, ...r]);
    e.currentTarget.value = "";
  };

  const forwardRow = (r: ReportRow) => {
    // hook up to your forward flow or API here
    alert(`Forwarding "${r.name}" to client…`);
  };

  const deleteRow = (r: ReportRow) => {
    if (!confirm(`Delete "${r.name}"?`)) return;
    setRows((curr) => curr.filter((x) => x.id !== r.id));
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Report</CardTitle>
          <CardDescription>Client reports generated or uploaded</CardDescription>
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
            Upload Report
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[40%]">Name</TableHead>
              <TableHead>Upload Time</TableHead>
              <TableHead>Uploader</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell>
                  <NameWithIcon name={r.name} />
                </TableCell>
                <TableCell>{r.uploadedAt}</TableCell>
                <TableCell>{r.uploader}</TableCell>
                <TableCell>
                  {r.status === "Client Unread" ? (
                    <Badge className="bg-amber-100 text-amber-700">Client Unread</Badge>
                  ) : (
                    <Badge className="bg-emerald-100 text-emerald-700">Read</Badge>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <div className="inline-flex items-center gap-3">
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground"
                      onClick={() => forwardRow(r)}
                      title="Forward"
                    >
                      <Share2 className="h-4 w-4" />
                      <span className="text-sm">Forward</span>
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

            {!rows.length && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  No reports yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
          <div>
            Showing 1 to {rows.length} of {rows.length} entries
          </div>
          <div>Page size: 10</div>
        </div>
      </CardContent>
    </Card>
  );
}
