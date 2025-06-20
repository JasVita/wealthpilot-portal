"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useWealthStore } from "@/stores/wealth-store";
import { Download, FileText } from "lucide-react";

export default function DocumentsPage() {
  const { uploadBatches } = useWealthStore();
  const [search, setSearch] = useState("");
  const MOCK_EXCEL_URL = "/static/result.xlsx"; // Replace with your real path

  const filteredBatches = uploadBatches.filter((batch: { files: any[] }) =>
    batch?.files?.some((file) => file.name.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <main className="p-6">
      {/* <h1 className="text-4xl font-semibold mb-6">Document Uploads</h1> */}

      <div className="mb-8">
        <Input
          placeholder="Search by file name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-md"
        />
      </div>

      {filteredBatches?.length === 0 ? (
        <p className="text-muted-foreground">No matching uploads found.</p>
      ) : (
        <div className="space-y-6">
          {filteredBatches?.map((batch: any, index: number) => (
            <Dialog key={index}>
              <DialogTrigger asChild>
                <Button variant="outline" className="w-full justify-between">
                  <span>
                    📁 Upload #{index + 1} ({batch.files.length} file{batch.files.length > 1 ? "s" : ""})
                  </span>
                  <FileText className="w-4 h-4" />
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Upload #{index + 1}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <ul className="list-disc list-inside">
                    {batch?.files.map((file: any, idx: number) => (
                      <li key={idx}>
                        <a href={file.url} target="_blank" rel="noopener noreferrer" className="text-primary underline">
                          {file.name}
                        </a>
                      </li>
                    ))}
                  </ul>
                  <Button variant="secondary" onClick={() => window.open(MOCK_EXCEL_URL, "_blank")}>
                    <Download className="w-4 h-4 mr-2" /> Download Excel Report
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          ))}
        </div>
      )}
    </main>
  );
}
