import React, { useMemo } from "react";
import { AllCommunityModule, ModuleRegistry, ColDef, ValueFormatterParams } from "ag-grid-community";
import { AgGridReact } from "ag-grid-react";
import { themeQuartz } from "ag-grid-community";

const myTheme = themeQuartz.withParams({
  columnBorder: true,
  headerFontFamily: "inherit",
  headerFontSize: 14,
  headerRowBorder: true,
  spacing: 8,
  wrapperBorder: true,
});

ModuleRegistry.registerModules([AllCommunityModule]);

interface DataTableProps {
  title?: string;
  rows: Record<string, unknown>[] | undefined | null;
  height?: number;
}

export const DataTable = ({ title, rows, height = 400 }: DataTableProps) => {
  // 1️⃣ Normalise `rows` so hooks always see an array
  const safeRows: Record<string, unknown>[] = Array.isArray(rows) ? rows : [];

  // 2️⃣ Hooks are now unconditional
  const rowData = useMemo(() => safeRows, [safeRows]);

  const columnDefs: ColDef[] = useMemo(() => {
    if (!rowData.length) return [];

    const first = rowData[0];
    return Object.keys(first).map((field) => ({
      field,
      headerName: field.replace(/_/g, " "),
      valueFormatter: (p: ValueFormatterParams) => {
        const v = p.value;
        if (v == null) return "";
        if (typeof v === "object") return JSON.stringify(v);
        return String(v);
      },
      flex: 1,
      sortable: true,
      filter: true,
      resizable: true,
      editable: true,
      cellClass: (p) => (typeof p.value === "number" ? "text-right" : ""),
    }));
  }, [rowData]);

  // 3️⃣ Do the early return **after** hooks
  if (!rowData.length) return null;

  return (
    <section className="space-y-2">
      {title && <h4 className="font-semibold">{title}</h4>}
      <div className="w-full" style={{ height }}>
        <AgGridReact rowData={rowData} columnDefs={columnDefs} animateRows theme={myTheme} />
      </div>
    </section>
  );
};
