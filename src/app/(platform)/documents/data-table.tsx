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

// import "ag-grid-community/styles/ag-grid.css";
// import "ag-grid-community/styles/ag-theme-alpine.css";

interface DataTableProps {
  title?: string;
  rows: Record<string, unknown>[] | undefined | null;
  height?: number;
}

export const DataTable = ({ title, rows, height = 400 }: DataTableProps) => {
  if (!Array.isArray(rows) || rows.length === 0) return null;

  const rowData = useMemo(() => rows, [rows]);

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

  // ---- Render -------------------------------------------------------------------
  return (
    <section className="space-y-2">
      {title && <h4 className="font-semibold">{title}</h4>}

      <div
        className="w-full"
        style={{ height }} // makes the grid vertically scroll when needed
      >
        <AgGridReact rowData={rowData} columnDefs={columnDefs} animateRows theme={myTheme} />
      </div>
    </section>
  );
};
