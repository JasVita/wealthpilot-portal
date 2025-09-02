import { useState, useEffect, useCallback, useRef, useImperativeHandle, useMemo } from "react";
import { AgGridReact } from "ag-grid-react";
import {
  AllCommunityModule,
  ModuleRegistry,
  ColDef,
  themeQuartz,
  GridReadyEvent,
  CellValueChangedEvent,
  GridApi,
} from "ag-grid-community";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

ModuleRegistry.registerModules([AllCommunityModule]);

const myTheme = themeQuartz.withParams({
  browserColorScheme: "light",
  headerFontSize: 14,
});

interface EditableDataTableProps {
  title: string;
  rows: Record<string, unknown>[];
  onDataChange: (newRows: Record<string, unknown>[]) => void;
  onRevert?: () => void; // Add this prop
  onApiReady?: (api: GridApi) => void;
}

export function EditableDataTable({ title, rows, onDataChange, onRevert, onApiReady }: EditableDataTableProps) {
  const [gridApi, setGridApi] = useState<any>(null);
  const [currentRows, setCurrentRows] = useState<Record<string, unknown>[]>(rows);
  const originalRowsRef = useRef<Record<string, unknown>[]>(rows);

  useEffect(() => {
    setCurrentRows(rows);
    originalRowsRef.current = JSON.parse(JSON.stringify(rows));
  }, [rows]);

  const onGridReady = useCallback((params: GridReadyEvent) => {
    setGridApi(params.api);
    onApiReady?.(params.api);
  }, []);

  const onCellValueChanged = useCallback(
    (event: CellValueChangedEvent) => {
      const updatedRows = [...currentRows];
      const rowIndex = event.rowIndex;
      if (rowIndex !== undefined && rowIndex !== null && rowIndex >= 0) {
        updatedRows[rowIndex] = { ...updatedRows[rowIndex], [event.column.getColId()]: event.newValue };
        setCurrentRows(updatedRows);
        onDataChange(updatedRows);
      }
    },
    [currentRows, onDataChange]
  );

  const addRow = useCallback(() => {
    if (currentRows.length === 0) {
      toast.error("Cannot add row to empty table");
      return;
    }

    // Create a new row with the same structure as the first row but with empty/default values
    const firstRow = currentRows[0];
    const newRow: Record<string, unknown> = {};

    Object.keys(firstRow).forEach((key) => {
      const value = firstRow[key];
      if (typeof value === "number") {
        newRow[key] = 0;
      } else if (typeof value === "boolean") {
        newRow[key] = false;
      } else if (value instanceof Date) {
        newRow[key] = new Date();
      } else {
        newRow[key] = "";
      }
    });

    const updatedRows = [...currentRows, newRow];
    setCurrentRows(updatedRows);
    onDataChange(updatedRows);
    toast.success("Row added");
  }, [currentRows, onDataChange]);

  const removeSelectedRows = useCallback(() => {
    if (!gridApi) return;

    const selectedRows = gridApi.getSelectedRows();
    if (selectedRows.length === 0) {
      toast.error("Please select rows to delete");
      return;
    }

    const updatedRows = currentRows.filter((row) => !selectedRows.includes(row));
    setCurrentRows(updatedRows);
    onDataChange(updatedRows);
    toast.success(`${selectedRows.length} row(s) deleted`);
  }, [gridApi, currentRows, onDataChange]);

  // Generate column definitions from the data
  const columnDefs: ColDef[] = useMemo(() => {
    if (currentRows.length === 0) return [];

    const firstRow = currentRows[0];
    return Object.keys(firstRow).map((key) => {
      const value = firstRow[key];
      const isNumeric = typeof value === "number";
      const isBoolean = typeof value === "boolean";
      const isDate = value instanceof Date || (typeof value === "string" && /^\d{4}-\d{2}-\d{2}/.test(value));

      return {
        headerName: key.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()),
        field: key,
        editable: true,
        sortable: true,
        resizable: true,
        flex: 1,
        minWidth: 100,
        cellEditor: isBoolean ? "agSelectCellEditor" : isDate ? "agDateCellEditor" : "agTextCellEditor",
        cellEditorParams: isBoolean ? { values: [true, false] } : undefined,
        valueFormatter: (params: any) => {
          if (isBoolean) {
            return params.value ? "Yes" : "No";
          }
          if (isDate && params.value) {
            return new Date(params.value).toLocaleDateString();
          }
          if (isNumeric && params.value !== null && params.value !== undefined) {
            return typeof params.value === "number" ? params.value.toLocaleString() : params.value;
          }
          return params.value;
        },
        valueParser: (params: any) => {
          if (isBoolean) {
            return params.newValue === "true" || params.newValue === true;
          }
          if (isNumeric) {
            const num = parseFloat(params.newValue);
            return isNaN(num) ? params.oldValue : num;
          }
          return params.newValue;
        },
        cellStyle: (params: any) => {
          if (isNumeric) {
            return { textAlign: "right" };
          }
          return null;
        },
      };
    });
  }, [currentRows]);

  if (currentRows.length === 0) {
    return (
      <div className="border rounded-lg p-4 bg-gray-50">
        <h4 className="font-medium mb-2">{title}</h4>
        <p className="text-sm text-gray-500">No data available</p>
      </div>
    );
  }

  return (
    <div className="border rounded-lg p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-medium">{title}</h4>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={addRow} className="flex items-center gap-1">
            <Plus className="h-4 w-4" />
            Add Row
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={removeSelectedRows}
            className="flex items-center gap-1 text-red-600 hover:text-red-700"
          >
            <Trash2 className="h-4 w-4" />
            Delete Selected
          </Button>
        </div>
      </div>

      <div className="ag-theme-quartz" style={{ height: 400, width: "100%" }}>
        <AgGridReact
          rowData={currentRows}
          columnDefs={columnDefs}
          theme={myTheme}
          onGridReady={onGridReady}
          onCellValueChanged={onCellValueChanged}
          rowSelection="multiple"
          animateRows={true}
          enableCellTextSelection={true}
          ensureDomOrder={true}
          defaultColDef={{
            sortable: true,
            resizable: true,
            editable: true,
          }}
        />
      </div>

      <div className="text-xs text-gray-500">
        Click on cells to edit • Select rows and click &quot;Delete Selected&quot; to remove • Click &quot;Add Row&quot;
        to insert new entries
      </div>
    </div>
  );
}
