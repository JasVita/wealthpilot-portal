import { Fragment, useState, useCallback } from "react";
import { Dialog, DialogContent2, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import type { Doc } from "./page";
import { Button } from "@/components/ui/button";
import { Download, Eye, Pencil, Loader2 } from "lucide-react";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { toast } from "sonner";
import { DataTable } from "./data-table";
import { EditableDataTable } from "./editable-data-table";
import { useClientStore } from "@/stores/clients-store";
import axios from "axios";

type TableBlock = { columnOrder: string[]; rows: Record<string, unknown>[] };
type SubTableGroup = { subTableOrder: string[] } & Record<string, TableBlock>;
type TableRoot = { tableOrder: string[] } & Record<string, SubTableGroup | TableBlock>;

function applyColumnOrder<T extends Record<string, unknown>>(rows: T[], columnOrder: string[] | undefined): T[] {
  if (!columnOrder?.length) return rows;
  return rows.map((row) => {
    const ordered: Record<string, unknown> = {};
    columnOrder.forEach((k) => k in row && (ordered[k] = row[k]));
    Object.keys(row).forEach((k) => !(k in ordered) && (ordered[k] = row[k]));
    return ordered as T;
  });
}

const buildPdfSrc = (url: string) => {
  const [base, hash] = url.split("#");
  const flags = "toolbar=0&navpanes=0&scrollbar=0&view=FitH";
  return `${base}#${hash ? `${hash}&` : ""}${flags}`;
};

export default function DocDialog({
  doc,
  mode,
  onDocumentUpdate,
  onRefreshDocuments,
}: {
  doc: Doc;
  mode: "view" | "edit";
  onDocumentUpdate?: (docId: string, updatedDoc: Partial<Doc>) => void;
  onRefreshDocuments?: () => void;
}) {
  const { currClient } = useClientStore();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editedData, setEditedData] = useState<{
    assets: any;
    transactions: any;
  }>({
    assets: doc.assets,
    transactions: doc.transactions,
  });

  const handleTableDataChange = useCallback(
    (
      section: "assets" | "transactions",
      categoryKey: string,
      subTableKey: string | null,
      newRows: Record<string, unknown>[]
    ) => {
      setEditedData((prev) => {
        const newData = { ...prev };

        if (subTableKey) {
          // Handle subtable case
          if (!newData[section][categoryKey]) {
            newData[section][categoryKey] = { subTableOrder: [] };
          }
          newData[section][categoryKey][subTableKey] = {
            ...newData[section][categoryKey][subTableKey],
            rows: newRows,
          };
        } else {
          // Handle direct table case
          newData[section][categoryKey] = {
            ...newData[section][categoryKey],
            rows: newRows,
          };
        }

        return newData;
      });
    },
    []
  );

  const saveChanges = async () => {
    if (!currClient) {
      toast.error("No client selected.");
      return;
    }

    setIsSaving(true);
    const toastId = toast("Saving changes…", {
      duration: Infinity,
      icon: <Loader2 className="animate-spin" />,
    });

    try {
      const { data } = await axios.patch<{
        task_id: string;
      }>(`${process.env.NEXT_PUBLIC_API_URL}/update_document`, {
        client_id: currClient,
        doc_id: doc.id,
        data: {
          assets: editedData.assets,
          transactions: editedData.transactions,
        },
      });

      const taskId = data.task_id;

      // Poll for completion
      const pollInterval = setInterval(async () => {
        try {
          const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/update_document/${taskId}`, {
            validateStatus: () => true,
          });

          if (res.status !== 202) {
            clearInterval(pollInterval);
            toast.dismiss(toastId);
            setIsSaving(false);

            if (res.status === 200) {
              toast.success("Document updated successfully.");
              setIsDialogOpen(false);

              // Update the document data
              if (onDocumentUpdate) {
                onDocumentUpdate(doc.id, {
                  assets: editedData.assets,
                  transactions: editedData.transactions,
                });
              }

              // Optionally refresh all documents
              if (onRefreshDocuments) {
                onRefreshDocuments();
              }
            } else {
              const errMsg = res.data?.error || res.statusText || "Server error";
              toast.error(`Update failed: ${errMsg}`);
            }
          }
        } catch (err) {
          console.error("Polling error:", err);
        }
      }, 2000);
    } catch (err: any) {
      toast.dismiss(toastId);
      setIsSaving(false);
      toast.error(err?.response?.data?.message || err?.message || "Update failed.");
    }
  };

  // Fixed: Properly handle dialog state changes
  const handleDialogOpenChange = useCallback(
    (open: boolean) => {
      if (!open && mode === "edit") {
        // Reset edited data when closing in edit mode
        setEditedData({
          assets: doc.assets,
          transactions: doc.transactions,
        });
      }
      setIsDialogOpen(open);
      console.log("some bullshit clicked");
    },
    [mode, doc.assets, doc.transactions]
  );

  // Fixed: Remove the manual onClick handler since DialogTrigger handles this
  const handleTriggerClick = useCallback(() => {
    // This will be handled by DialogTrigger automatically
    // No need to manually set dialog state here
    console.log("DialogTrigger clicked");
  }, []);

  function renderTableRoot(root: TableRoot | undefined, sectionTitle: string, section: "assets" | "transactions") {
    if (!root?.tableOrder?.length) return null;

    const currentData = mode === "edit" ? editedData[section] : root;

    return (
      <>
        <h3 className="text-xl font-semibold text-center">{sectionTitle}</h3>

        {root.tableOrder.map((catKey) => {
          const cat = currentData[catKey] as SubTableGroup | TableBlock | undefined;
          if (!cat) return null;

          /* Category contains subtables */
          if ("subTableOrder" in cat && Array.isArray(cat.subTableOrder)) {
            return (
              <Fragment key={catKey}>
                <h4 className="font-semibold text-center mt-4">{catKey.replace(/_/g, " ")}</h4>
                {cat.subTableOrder.map((subKey) => {
                  const tbl = cat[subKey] as TableBlock | undefined;
                  if (!tbl?.rows?.length) return null;
                  const rows = applyColumnOrder(tbl.rows, tbl.columnOrder);

                  if (mode === "edit") {
                    return (
                      <EditableDataTable
                        key={`${catKey}-${subKey}`}
                        title={subKey.replace(/_/g, " ")}
                        rows={rows}
                        onDataChange={(newRows) => handleTableDataChange(section, catKey, subKey, newRows)}
                      />
                    );
                  } else {
                    return <DataTable key={`${catKey}-${subKey}`} title={subKey.replace(/_/g, " ")} rows={rows} />;
                  }
                })}
              </Fragment>
            );
          }

          /* Category itself is a single table */
          if ((cat as TableBlock).rows?.length) {
            const tbl = cat as TableBlock;
            const rows = applyColumnOrder(tbl.rows, tbl.columnOrder);

            if (mode === "edit") {
              return (
                <EditableDataTable
                  key={catKey}
                  title={catKey.replace(/_/g, " ")}
                  rows={rows}
                  onDataChange={(newRows) => handleTableDataChange(section, catKey, null, newRows)}
                />
              );
            } else {
              return <DataTable key={catKey} title={catKey.replace(/_/g, " ")} rows={rows} />;
            }
          }
          return null;
        })}
      </>
    );
  }

  return (
    <Dialog open={isDialogOpen} onOpenChange={handleDialogOpenChange}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" onClick={handleTriggerClick}>
          {mode === "view" ? <Eye className="h-4 w-4" /> : <Pencil className="h-4 w-4" />}
        </Button>
      </DialogTrigger>

      <DialogContent2>
        <DialogTitle className="hidden"></DialogTitle>
        <DialogDescription className="hidden"></DialogDescription>
        {mode === "view" ? (
          <Button
            size="lg"
            className="gap-2 mb-4 w-1/3 mx-auto my-4"
            onClick={() => doc.excel_url && window.open(doc.excel_url)}
            disabled={!doc.excel_url}
          >
            <Download className="h-4 w-4" />
            Download Excel
          </Button>
        ) : (
          <Button size="lg" className="gap-2 mb-4 w-1/3 mx-auto my-4" onClick={saveChanges} disabled={isSaving}>
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4 rotate-90" />}
            {isSaving ? "Saving..." : "Save changes"}
          </Button>
        )}

        <ResizablePanelGroup direction="horizontal" className="w-full h-[80vh]">
          {/* PDF */}
          <ResizablePanel defaultSize={50} minSize={30}>
            <div className="flex flex-col overflow-y-auto pr-2 h-full">
              <span className="mb-2 text-xl font-semibold truncate text-center">{doc.bankname}</span>
              {doc.pdf_url ? (
                <iframe
                  src={buildPdfSrc(doc.pdf_url)}
                  className="flex-1 w-full border-0 bg-white h-full"
                  allowFullScreen
                />
              ) : (
                <div className="flex items-center justify-center flex-1 text-gray-500">No PDF available</div>
              )}
            </div>
          </ResizablePanel>

          <ResizableHandle withHandle />

          {/* Tables */}
          <ResizablePanel defaultSize={50} minSize={30}>
            <div className="flex flex-col overflow-y-auto pl-2 h-full space-y-6">
              {renderTableRoot(doc.assets, "Assets", "assets")}
              {renderTableRoot(doc.transactions, "Transactions", "transactions")}
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </DialogContent2>
    </Dialog>
  );
}
