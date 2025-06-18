"use client";

import { useEffect } from "react";
import { useTableStore } from "@/stores/tables-store";
import { RenderCustomTable } from "@/components/render-custom-table";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";

export default function FinancialOverview() {
  const { tableDocs, selectedId, setSelectedId, fetchTableById, uploadMockTable } = useTableStore();

  const selectedDoc = tableDocs.find((d) => d.id === selectedId);

  useEffect(() => {
    if (!selectedId && tableDocs.length > 0) {
      setSelectedId(tableDocs[0].id);
    }
  }, [selectedId, tableDocs]);

  const handleMockUpload = async () => {
    try {
      await uploadMockTable();
      console.log("✅ Mock table uploaded");
    } catch (err) {
      console.error("❌ Upload failed:", err);
    }
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center gap-4">
        <Button onClick={handleMockUpload}>📄 Upload Mock Table</Button>

        <Select value={selectedId ?? undefined} onValueChange={fetchTableById}>
          <SelectTrigger className="w-[250px]">
            <SelectValue placeholder="Select document" />
          </SelectTrigger>
          <SelectContent>
            {tableDocs.map((doc) => (
              <SelectItem key={doc.id} value={doc.id}>
                Document #{doc.id}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedDoc && <RenderCustomTable data={selectedDoc.data} />}
    </div>
  );
}
