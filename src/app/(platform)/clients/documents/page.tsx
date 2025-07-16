/* ─────────────────── /documents/page.tsx ─────────────────── */
"use client";

import { Fragment, useEffect, useState, useCallback, useRef } from "react";
import axios from "axios";
import { Dialog, DialogTrigger, DialogContent2, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, Eye, Pencil, Trash2, AlertCircleIcon, Loader2 } from "lucide-react";
import { DataTable } from "./data-table";
import { useClientStore } from "@/stores/clients-store";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { AgGridReact } from "ag-grid-react";
import { AllCommunityModule, ModuleRegistry, ColDef } from "ag-grid-community";
import { themeQuartz } from "ag-grid-community";
import { Description, DialogTitle } from "@radix-ui/react-dialog";

ModuleRegistry.registerModules([AllCommunityModule]);
const myTheme = themeQuartz.withParams({
  // spacing: 8,
  // headerBackgroundColor: "#11223D",
  // headerTextColor: "#FFFFFF",

  // accentColor: "#087AD1",
  // borderColor: "#D7E2E6",
  // browserColorScheme: "light",
  // cellHorizontalPaddingScale: 0.7,
  // columnBorder: false,
  // fontFamily: {
  //   googleFont: "Inter",
  // },
  // fontSize: 14,
  // foregroundColor: "#555B62",
  // // headerBackgroundColor: "#11223D",
  // headerBackgroundColor: "#0f172b",
  // headerFontSize: 13,
  // headerFontWeight: 400,
  // headerTextColor: "#FFFFFF",
  // rowBorder: true,
  // rowVerticalPaddingScale: 0.8,
  // sidePanelBorder: true,
  // spacing: 8,
  // wrapperBorder: false,
  // wrapperBorderRadius: 2,

  browserColorScheme: "light",
  headerFontSize: 14,
});

/* ---------- helpers ---------- */
const buildPdfSrc = (url: string) => {
  const [base, hash] = url.split("#");
  const flags = "toolbar=0&navpanes=0&scrollbar=0&view=FitH";
  return `${base}#${hash ? `${hash}&` : ""}${flags}`;
};

function applyColumnOrder<T extends Record<string, unknown>>(rows: T[], columnOrder: string[] | undefined): T[] {
  if (!columnOrder?.length) return rows;
  return rows.map((row) => {
    const ordered: Record<string, unknown> = {};
    columnOrder.forEach((k) => k in row && (ordered[k] = row[k]));
    Object.keys(row).forEach((k) => !(k in ordered) && (ordered[k] = row[k]));
    return ordered as T;
  });
}

const fmtDate = (d: string | Date | null | undefined) => (d ? new Date(d).toISOString().slice(0, 10) : "");

function DeleteButton({ doc, onDelete }: { doc: PortfolioDocument; onDelete: (d: PortfolioDocument) => void }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button variant="ghost" size="icon" className="text-red-600" onClick={() => setOpen(true)}>
        <Trash2 className="h-4 w-4" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        {/* hidden trigger so Dialog works when we toggle `open` imperatively */}
        <DialogTrigger asChild />

        <DialogContent className="sm:max-w-lg">
          <DialogTitle className="hidden"></DialogTitle>
          <Description className="hidden"></Description>
          <h3 className="text-lg font-semibold mb-2">Delete this document?</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            You’re about to permanently remove the&nbsp;
            <strong>{doc.bankname}</strong> statement dated&nbsp;
            <strong>{fmtDate(doc.as_of_date)}</strong>. <br />
            This action can’t be undone. Portfolio insights &amp; trend charts will be rebuilt in the background and may
            be unavailable for up to a minute.
          </p>

          <div className="flex justify-end gap-2 pt-6">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                setOpen(false);
                onDelete(doc);
              }}
            >
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function useDeletePoller() {
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  const startPolling = useCallback((taskId: string, toastId: string | number, restore: () => void) => {
    if (pollRef.current) clearInterval(pollRef.current);

    pollRef.current = setInterval(async () => {
      try {
        /* always resolve so we can read status even on 500 */
        const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/delete_documents/${taskId}`, {
          validateStatus: () => true,
        });
        console.log("Poll delete status:", JSON.stringify(res, null, 2));

        /* ----- 1️⃣ stop as soon as status ≠ 202 ----- */
        if (res.status !== 202) {
          toast.dismiss(toastId);

          if (res.status === 200) {
            toast.success("Document deleted successfully.");
          } else {
            // 500 or anything else
            const errMsg = res.data?.error || res.statusText || "Server error";
            toast.error(`Delete failed: ${errMsg}`);
            restore(); // put the doc back
          }

          clearInterval(pollRef.current!);
          return;
        }

        /* ----- 2️⃣ still 202 → optional progress UI ----- */
        // you can surface PROGRESS meta here if desired
        // const { state, deleted, dates } = res.data;
      } catch {
        /* network hiccup – ignore and keep polling */
      }
    }, 10_000);
  }, []);

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  return startPolling;
}

const saveChanges = (doc: PortfolioDocument) => {
  toast.success(`(mock) saved changes for ${doc.bankname}`);
};

/* ---------- (generic) renderer for 2‑level table hierarchies ---------- */
type TableBlock = { columnOrder: string[]; rows: Record<string, unknown>[] };
type SubTableGroup = { subTableOrder: string[] } & Record<string, TableBlock>;
type TableRoot = { tableOrder: string[] } & Record<string, SubTableGroup | TableBlock>;

function renderTableRoot(root: TableRoot | undefined, sectionTitle: string) {
  if (!root?.tableOrder?.length) return null;

  return (
    <>
      <h3 className="text-xl font-semibold text-center">{sectionTitle}</h3>

      {root.tableOrder.map((catKey) => {
        const cat = root[catKey] as SubTableGroup | TableBlock | undefined;
        if (!cat) return null;

        /* 1️⃣  Category contains subtables (most asset / tx cases) */
        if ("subTableOrder" in cat && Array.isArray(cat.subTableOrder)) {
          return (
            <Fragment key={catKey}>
              <h4 className="font-semibold text-center mt-4">{catKey.replace(/_/g, " ")}</h4>
              {cat.subTableOrder.map((subKey) => {
                const tbl = cat[subKey] as TableBlock | undefined;
                if (!tbl?.rows?.length) return null;
                const rows = applyColumnOrder(tbl.rows, tbl.columnOrder);
                return <DataTable key={`${catKey}-${subKey}`} title={subKey.replace(/_/g, " ")} rows={rows} />;
              })}
            </Fragment>
          );
        }

        /* 2️⃣  Category itself is a single table (edge‑case fallback) */
        if ((cat as TableBlock).rows?.length) {
          const tbl = cat as TableBlock;
          const rows = applyColumnOrder(tbl.rows, tbl.columnOrder);
          return <DataTable key={catKey} title={catKey.replace(/_/g, " ")} rows={rows} />;
        }
        return null;
      })}
    </>
  );
}

/* ---------- API‑level types (minimal; extend as required) ---------- */
interface PortfolioDocument {
  id: string;
  bankname: string;
  as_of_date: string;
  pdf_url: string;
  excel_url: string | null;
  assets?: TableRoot;
  transactions?: TableRoot;
  tag: string;
}

/* ---------- Page ---------- */
export default function DocumentsMergedPage() {
  const [search, setSearch] = useState("");
  const { currClient } = useClientStore();
  const pollDeletion = useDeletePoller();

  const [docs, setDocs] = useState<PortfolioDocument[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "error" | "ready">("idle");
  const [errorMsg, setErrorMsg] = useState<string>("");

  /* ---------------------- fetch documents when client changes ------------- */
  useEffect(() => {
    if (!currClient) {
      setDocs([]);
      setStatus("idle");
      return;
    }

    (async () => {
      setStatus("loading");
      try {
        const { data } = await axios.post<{
          status: string;
          documents: PortfolioDocument[];
          message: string;
        }>(`${process.env.NEXT_PUBLIC_API_URL}/documents`, {
          client_id: currClient,
        });
        // console.log("Fetched documents:", JSON.stringify(data, null, 2));

        if (data.status !== "ok") throw new Error(data.message);
        setDocs(
          (data.documents ?? []).map((doc) => ({
            ...doc,
            tag: `${doc.bankname} (${fmtDate(doc.as_of_date)})`,
          }))
        );
        setStatus("ready");
      } catch (err: any) {
        setErrorMsg(err?.response?.data?.message || err?.message || "Unknown error");
        setStatus("error");
      }
    })();
  }, [currClient]);

  const deleteDocument = async (doc: PortfolioDocument) => {
    if (!currClient) {
      toast.error("No client selected.");
      return;
    }

    /* 1️⃣ optimistic UI removal */
    const previousDocs = docs;
    setDocs((prev) => prev.filter((d) => d.id !== doc.id));

    /* 2️⃣ spinning toast that stays until we dismiss it manually */
    const toastId = toast("Deleting document…", {
      duration: Infinity,
      icon: <Loader2 className="animate-spin" />,
    });

    try {
      const { data } = await axios.post<{
        task_id: string;
      }>(`${process.env.NEXT_PUBLIC_API_URL}/delete_documents`, {
        doc_ids: [doc.id],
        client_id: currClient,
      });

      const taskId = data.task_id;
      pollDeletion(taskId, toastId, () => setDocs(previousDocs)); // start polling
    } catch (err: any) {
      toast.dismiss(toastId);
      setDocs(previousDocs);
      toast.error(err?.response?.data?.message || err?.message || "Delete failed.");
    }
  };

  function DocDialog({ doc, mode }: { doc: PortfolioDocument; mode: "view" | "edit" }) {
    return (
      <Dialog>
        <DialogTrigger asChild>
          <Button variant="ghost" size="icon">
            {mode === "view" ? <Eye className="h-4 w-4" /> : <Pencil className="h-4 w-4" />}
          </Button>
        </DialogTrigger>

        <DialogContent2>
          <DialogTitle className="hidden"></DialogTitle>
          <Description className="hidden"></Description>
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
            <Button size="lg" className="gap-2 mb-4 w-1/3 mx-auto my-4" onClick={() => saveChanges(doc)}>
              <Download className="h-4 w-4 rotate-90" />
              Save changes
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
                {renderTableRoot(doc.assets, "Assets")}
                {renderTableRoot(doc.transactions, "Transactions")}
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
        </DialogContent2>
      </Dialog>
    );
  }

  const rows = docs
    .filter((d) => d.tag.toLowerCase().includes(search.toLowerCase()))
    .map((d) => ({
      id: d.id,
      bank: d.bankname,
      date: fmtDate(d.as_of_date),
      raw: d, // keep whole doc for the dialog
    }));

  const columnDefs: ColDef[] = [
    { headerName: "Bank", field: "bank", flex: 2, sortable: true, floatingFilter: true, filter: true },
    { headerName: "Date", field: "date", flex: 1, sortable: true },
    {
      headerName: "Actions",
      field: "actions",
      type: "numericColumn",
      cellRenderer: (p: { data: { raw: PortfolioDocument } }) => {
        const doc = p.data.raw;
        return (
          <div className="flex gap-2">
            <DocDialog doc={doc} mode="view" />
            <DocDialog doc={doc} mode="edit" />
            <DeleteButton doc={doc} onDelete={deleteDocument} />
          </div>
        );
      },
      cellStyle: { display: "flex", justifyContent: "end" },
    },
  ];

  /* --------------------------- render states ------------------------------ */
  if (status === "idle") return <></>;

  if (status === "loading")
    return (
      <div className="flex flex-col p-6 gap-4">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="flex flex-col space-y-3 items-center">
            {/* <Skeleton className="h-[125px] w-full rounded-xl" /> */}
            <Skeleton className="h-7 w-3/4" />
            <Skeleton className="h-7 w-1/2" />
          </div>
        ))}
      </div>
    );

  if (status === "error")
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertCircleIcon className="h-5 w-5" />
          <AlertTitle>Oops! Something went wrong.</AlertTitle>
          <AlertDescription>{errorMsg}</AlertDescription>
        </Alert>
      </div>
    );

  if (!docs.length)
    return (
      <p className="p-6 text-gray-500">
        No documents found for this client yet. Upload a bank statement to get started.
      </p>
    );

  return (
    <main className="p-6 space-y-6">
      {rows.length === 0 ? (
        <p className="text-muted-foreground">No matching documents found.</p>
      ) : (
        <div className="ag-theme-quartz w-full" style={{ maxHeight: 600 }}>
          <AgGridReact rowData={rows} animateRows domLayout="autoHeight" theme={myTheme} columnDefs={columnDefs} />
        </div>
      )}
    </main>
  );
}
