"use client";
import React, { useEffect } from "react";
import axios from "axios";
import { useClientStore } from "@/stores/clients-store";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import DeleteButton from "./delete-button";
import { AlertCircleIcon } from "lucide-react";
import { AgGridReact } from "ag-grid-react";
import { AllCommunityModule, ModuleRegistry, ColDef, themeQuartz } from "ag-grid-community";
import DocDialog from "./doc-dialog";
ModuleRegistry.registerModules([AllCommunityModule]);
const myTheme = themeQuartz.withParams({
  browserColorScheme: "light",
  headerFontSize: 14,
});

export interface Doc {
  id: string;
  bankname: string;
  as_of_date: string;
  pdf_url: string;
  excel_url: string;
  assets?: any;
  transactions?: any;
}

export const fmtDate = (d: string | Date | null | undefined) => (d ? new Date(d).toISOString().slice(0, 10) : "");

export default function Page() {
  const { currClient } = useClientStore();
  const [docs, setDocs] = React.useState<Doc[]>([]);
  const [status, setStatus] = React.useState<"idle" | "loading" | "ready" | "error">("idle");
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

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
          documents: Doc[];
          message: string;
        }>(`${process.env.NEXT_PUBLIC_API_URL}/documents`, {
          client_id: currClient,
        });
        // console.log("Fetched documents:", JSON.stringify(data, null, 2));

        if (data.status !== "ok") throw new Error(data.message);
        setDocs(data.documents ?? []);
        setStatus("ready");
      } catch (err: any) {
        setErrorMsg(err?.response?.data?.message || err?.message || "Unknown error");
        setStatus("error");
      }
    })();
  }, [currClient]);

  const columnDefs: ColDef[] = [
    { headerName: "Bank", field: "bank", flex: 2, sortable: true, floatingFilter: true, filter: true },
    { headerName: "Date", field: "date", flex: 1, sortable: true },
    {
      headerName: "Actions",
      field: "actions",
      type: "numericColumn",
      cellStyle: { display: "flex", justifyContent: "end" },
      cellRenderer: (p: { data: { raw: Doc } }) => {
        const doc = p.data.raw;
        return (
          <div className="flex gap-2">
            <DocDialog doc={doc} mode="view" />
            <DocDialog doc={doc} mode="edit" />
            <DeleteButton doc={doc} docs={docs} setDocs={setDocs} />
          </div>
        );
      },
    },
  ];

  const rows = docs.map((d) => ({
    id: d.id,
    bank: d.bankname,
    date: fmtDate(d.as_of_date),
    raw: d,
  }));

  if (status === "idle") return <></>;

  if (status === "loading")
    return (
      <div className="flex flex-col p-6 gap-4">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="flex flex-col space-y-3 items-center">
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
