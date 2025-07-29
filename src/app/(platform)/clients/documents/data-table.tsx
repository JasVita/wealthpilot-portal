"use client";

import React, {
  forwardRef,
  useImperativeHandle,
  useMemo,
  useRef,
  useEffect
} from "react";
import {
  AllCommunityModule,
  ColDef,
  ModuleRegistry,
  ValueFormatterParams
} from "ag-grid-community";
import { AgGridReact } from "ag-grid-react";
import { themeQuartz } from "ag-grid-community";

import useLivePrices from "@/lib/markets/useLivePrices";

const myTheme = themeQuartz.withParams({ columnBorder: true, spacing: 8 });
ModuleRegistry.registerModules([AllCommunityModule]);
const px = (txt: string) => Math.max(txt.length * 8 + 60, 80);

interface Props {
  title?: string;
  rows?: Record<string, any>[] | null;
  maxHeight?: number;
  showLivePrices?: boolean; // NEW
}
export interface DataTableHandle {
  getRows: () => any[];
}

// Extract ticker only from "Ticker: XXX" in extra field
const extractIdentifier = (extra?: string): string | null => {
  if (!extra) return null;

  const isinMatch = extra.match(/ISIN:\s*([A-Z0-9]+)/i);
  if (isinMatch?.[1]) return isinMatch[1].toUpperCase();

  const tickerMatch = extra.match(/Ticker:\s*([A-Z0-9.\-]+)/i);
  if (tickerMatch?.[1]) return tickerMatch[1].toUpperCase();

  return null;
}; 
const capitalizeFirstLetter = (val: string) => {
  return String(val).charAt(0).toUpperCase() + String(val).slice(1);
};

export const DataTable = forwardRef<DataTableHandle, Props>(
  ({ title, rows, maxHeight = 600, showLivePrices = false }, ref) => {
    const baseRows = useMemo(
      () => (Array.isArray(rows) ? rows : []).map((r) => ({ ...r })),
      [rows]
    );

    const tickers = useMemo(
      () =>
        Array.from(
          new Set(
            showLivePrices
              ? baseRows
                  .map((r) => extractIdentifier(r.extra))
                  .filter((id): id is string => !!id)
              : []
          )
        ),
      [baseRows, showLivePrices]
    );

    const prices = useLivePrices(tickers, 60000);

    const rowData = useMemo(
      () =>
        baseRows.map((r) => {
          if (!showLivePrices) return r;

          const id = extractIdentifier(r.extra);
          const quote = id ? prices[id] : null;

          const price = quote?.price ?? null;
          const prev = quote?.prevClose ?? null;
          const pct =
            price != null && prev != null && prev !== 0
              ? ((price - prev) / prev) * 100
              : null;

          return {
            ...r,
            live_price: price,
            prev_close: prev,
            change_pct: pct
          };
        }),
      [baseRows, prices, showLivePrices]
    );

    const columnDefs: ColDef[] = useMemo(() => {
      if (!rowData.length) return [];

      const keys = Object.keys(rowData[0]).filter((k) => k !== "__rid");

      const visibleKeys = showLivePrices
        ? keys
        : keys.filter((k) => !["live_price", "prev_close", "change_pct"].includes(k));

      return visibleKeys.map((f) => ({
        field: f,
        headerName: capitalizeFirstLetter(f.replace(/_/g, " ")),
        minWidth: px(f),
        flex: 1,
        sortable: true,
        filter: true,
        resizable: true,
        valueFormatter: (p: ValueFormatterParams) => {
          const val = p.value;

          if (f === "live_price") {
            return val != null ? `$${val.toFixed(2)}` : "—";
          }

          if (f === "change_pct") {
            if (val == null) return "—";
            const arrow = val >= 0 ? "▲" : "▼";
            const sign = val >= 0 ? "+" : "−";
            return `${arrow} ${sign}${Math.abs(val).toFixed(2)}%`;
          }

          return val ?? "";
        },
        cellClass: (p) => {
          if (f === "change_pct" || f === "live_price") {
            const pct = p.data?.change_pct;
            if (pct == null) return "";
            return pct >= 0 ? "price-up" : "price-down";
          }
          return typeof p.value === "number" ? "text-right" : "";
        }
      }));
    }, [rowData, showLivePrices]);

    const gridApi = useRef<import("ag-grid-community").GridApi | null>(null);
    useImperativeHandle(ref, () => ({
      getRows: () => {
        const out: any[] = [];
        gridApi.current?.forEachNode((n) => out.push(n.data));
        return out;
      }
    }));

    if (!rowData.length) return null;

    return (
      <section className="space-y-2">
        {title && <h4 className="font-semibold">{capitalizeFirstLetter(title)}</h4>}
        <div
          className="w-full overflow-x-auto overflow-y-auto"
          style={{ maxHeight }}
        >
          <AgGridReact
            rowData={rowData}
            columnDefs={columnDefs}
            theme={myTheme}
            domLayout="autoHeight"
            animateRows
            getRowId={(p) => p.data.name}
            onGridReady={(e) => (gridApi.current = e.api)}
          />
        </div>
      </section>
    );
  }
);
DataTable.displayName = "DataTable";
