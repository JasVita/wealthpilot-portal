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
  /** maximum height before we start vertical scrolling (default = 600 px) */
  maxHeight?: number;
}

/** crude text-to-pixels helper (≈8 px per char + 24 px padding) */
const minWidthForHeader = (label: string) => Math.max(label.length * 8 + 60, 80); // never smaller than 80 px

export const DataTable = ({ title, rows, maxHeight = 600 }: DataTableProps) => {
  const safeRows: Record<string, unknown>[] = Array.isArray(rows) ? rows : [];
  const rowData = useMemo(() => safeRows, [safeRows]);

  const columnDefs: ColDef[] = useMemo(() => {
    if (!rowData.length) return [];
    const first = rowData[0];

    return Object.keys(first).map((field) => {
      const header = field.replace(/_/g, " ");
      return {
        field,
        headerName: header,
        minWidth: minWidthForHeader(header), // 👈 key addition
        flex: 1, // still share extra space
        sortable: true,
        filter: true,
        resizable: true,
        editable: true,
        valueFormatter: (p: ValueFormatterParams) => {
          const v = p.value;
          if (v == null) return "";
          if (typeof v === "object") return JSON.stringify(v);
          return String(v);
        },
        cellClass: (p) => (typeof p.value === "number" ? "text-right" : ""),
      };
    });
  }, [rowData]);

  if (!rowData.length) return null;

  return (
    <section className="space-y-2">
      {title && <h4 className="font-semibold">{title}</h4>}

      {/* wrapper controls both vertical & horizontal overflow */}
      <div className="w-full overflow-x-auto overflow-y-auto" style={{ maxHeight }}>
        <AgGridReact
          rowData={rowData}
          columnDefs={columnDefs}
          animateRows
          theme={myTheme}
          domLayout="autoHeight" // grid grows until maxHeight
        />
      </div>
    </section>
  );
};
