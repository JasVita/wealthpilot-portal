"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useClientStore } from "@/stores/clients-store";
import { notFound } from "next/navigation";
import { getDocById, Doc } from "@/lib/mock-docs";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Pencil, Trash2, ArrowLeft } from "lucide-react";

/* minimal copy of your file-icon helper for the header (optional) */
function extOf(name?: string) {
  return (name?.split(".").pop() || "").toLowerCase();
}

function Preview({ doc }: { doc: Doc }) {
  const ext = extOf(doc.name);

  if (!doc.url) {
    return (
      <div className="flex h-[70vh] items-center justify-center text-sm text-muted-foreground">
        Preview not available for this file.
      </div>
    );
  }

  // Simple preview rules:
  if (ext === "pdf") {
    return (
      <iframe
        src={doc.url}
        className="w-full h-[70vh] rounded border"
        title={doc.name}
      />
    );
  }

  if (["jpg", "jpeg", "png", "gif", "webp"].includes(ext)) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={doc.url} alt={doc.name} className="max-h-[70vh] rounded border" />;
  }

  if (["txt", "csv"].includes(ext)) {
    return (
      <iframe
        src={doc.url}
        className="w-full h-[70vh] rounded border bg-white"
        title={doc.name}
      />
    );
  }

  // For docx/xlsx and others, show placeholder + download
  return (
    <div className="flex h-[70vh] items-center justify-center text-sm text-muted-foreground">
      No inline preview for .{ext}. Use Download to open locally.
    </div>
  );
}

export default function DocumentDetail({
  params,
}: {
  params: { clientId: string; docId: string };
}) {
  const { setCurrClient } = useClientStore();

  useEffect(() => {
    if (params.clientId) setCurrClient(params.clientId);
  }, [params.clientId, setCurrClient]);

  const doc = getDocById(params.docId);
  if (!doc) return notFound();

  return (
    <div className="p-4 space-y-4">
      {/* Top bar */}
      <div className="flex items-center justify-between">
        <Link
          href={`/clients_clone/${params.clientId}/documents`}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Documents
        </Link>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Pencil className="h-4 w-4 mr-2" />
            Edit
          </Button>
          <a href={doc.url || "#"} download className="inline-flex">
            <Button variant="outline" size="sm" disabled={!doc.url}>
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
          </a>
          <Button variant="destructive" size="sm">
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </Button>
        </div>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left: Details */}
        <Card>
          <CardHeader>
            <CardTitle>Document Details</CardTitle>
            <CardDescription>Metadata & history</CardDescription>
          </CardHeader>
          <CardContent className="text-sm">
            <dl className="grid grid-cols-3 gap-y-2">
              <dt className="col-span-1 text-muted-foreground">Linked</dt>
              <dd className="col-span-2">{doc.linked}</dd>

              <dt className="col-span-1 text-muted-foreground">Type</dt>
              <dd className="col-span-2">{doc.type}</dd>

              <dt className="col-span-1 text-muted-foreground">Name</dt>
              <dd className="col-span-2 break-words">{doc.name}</dd>

              <dt className="col-span-1 text-muted-foreground">Expiration</dt>
              <dd className="col-span-2">{doc.exp}</dd>

              <dt className="col-span-1 text-muted-foreground">Remarks</dt>
              <dd className="col-span-2">{doc.remarks || "—"}</dd>

              <dt className="col-span-1 text-muted-foreground">Created By</dt>
              <dd className="col-span-2">{doc.createdBy || "—"}</dd>

              <dt className="col-span-1 text-muted-foreground">Created Time</dt>
              <dd className="col-span-2">{doc.createdAt || "—"}</dd>

              <dt className="col-span-1 text-muted-foreground">Latest Updater</dt>
              <dd className="col-span-2">{doc.updatedBy || "—"}</dd>

              <dt className="col-span-1 text-muted-foreground">Updated Time</dt>
              <dd className="col-span-2">{doc.updatedAt || "—"}</dd>
            </dl>
          </CardContent>
        </Card>

        {/* Right: Preview */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Document Preview</CardTitle>
            <CardDescription>
              PDF, image and text files preview inline. Other types provide a download.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Preview doc={doc} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
