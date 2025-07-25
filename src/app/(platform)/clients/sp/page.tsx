"use client";
import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Legend,
  PieChart,
  Pie,
  Cell,
  Tooltip,
} from "recharts";
import { useClientStore } from "@/stores/clients-store";
import { Button } from "@/components/ui/button";
import { AgGridReact } from "ag-grid-react";
import { AllCommunityModule, ModuleRegistry, ColDef, themeQuartz } from "ag-grid-community";
ModuleRegistry.registerModules([AllCommunityModule]);

/**
 * Structured Products Page
 * -------------------------------------------------------
 * 1. Fetches all documents for the selected client (currClient)
 * 2. Extracts every sub‑table whose key contains "product" from the `assets` JSON
 * 3. Displays:
 *    – Maturity Ladder (BarChart)
 *    – Counterparty Risk (PieChart)
 *    – AG‑Grid table of raw structured‑product rows
 *
 * The helper functions at the bottom (buildMaturityChartData & buildCounterpartyRiskData)
 * convert the flattened rows → chart‑ready series. Feel free to swap them out if your
 * DB schema evolves – everything else should Just Work™.
 * -------------------------------------------------------
 */

/* -------------------------------------------------------------------------- */
/*                               Type helpers                                 */
/* -------------------------------------------------------------------------- */

type Doc = {
  id: string;
  bankname: string;
  as_of_date: string;
  pdf_url: string;
  excel_url: string;
  assets?: Record<string, any>;
};

type ProductRow = Record<string, any> & {
  /** convenience fields injected by extract step */
  issuing_bank?: string;
  doc_id?: string;
};

/* -------------------------------------------------------------------------- */
/*                                 Constants                                  */
/* -------------------------------------------------------------------------- */

const CHART_COLORS = [
  "#0CA3A3",
  "#11223D",
  "#8B5CF6",
  "#F59E0B",
  "#EF4444",
  "#14B8A6",
  "#C026D3",
  "#6366F1",
  "#4ADE80",
];

/* -------------------------------------------------------------------------- */
/*                                Components                                  */
/* -------------------------------------------------------------------------- */

const StructuredProductsPage = () => {
  /* -------------- 1️⃣  Global client selection (Zustand store) -------------- */
  const { currClient } = useClientStore();

  /* ----------------------------- Local state ------------------------------ */
  const [docs, setDocs] = useState<Doc[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [selectedRow, setSelectedRow] = useState<ProductRow | null>(null);

  /* ----------------------- 2️⃣  Fetch documents once ----------------------- */
  useEffect(() => {
    if (!currClient) {
      setDocs([]);
      setStatus("idle");
      return;
    }

    (async () => {
      try {
        setStatus("loading");
        const { data } = await axios.post<{
          status: string;
          documents: Doc[];
          message: string;
        }>(`${process.env.NEXT_PUBLIC_API_URL}/documents`, { client_id: currClient });

        if (data.status !== "ok") throw new Error(data.message);
        setDocs(data.documents ?? []);
        setStatus("ready");
      } catch (err: any) {
        setErrorMsg(err?.response?.data?.message || err?.message || "Unknown error");
        setStatus("error");
      }
    })();
  }, [currClient]);

  /* ------------------ 3️⃣  Flatten every *product* sub‑table ----------------- */
  const productRows: ProductRow[] = useMemo(() => {
    const rows: ProductRow[] = [];

    docs.forEach((doc) => {
      const { assets } = doc;
      if (!assets) return;

      Object.entries(assets).forEach(([tblKey, tblVal]: [string, any]) => {
        if (!tblKey.toLowerCase().includes("product")) return; // skip non-product tables

        // ── pick the first sub-table (or the rows array itself) ──────────────────
        const subName = tblVal.subTableOrder?.[0];
        const rawRows: any[] = subName ? tblVal[subName]?.rows ?? [] : tblVal.rows ?? [];

        rawRows.forEach((r) => {
          /* ---------------- source‑agnostic extraction ---------------- */
          const description = pick<string>(r, ["security_description", "Description"]) || "";
          const marketValue =
            pick<number>(r, ["market_value_usd", "market_value_orig_ccy", "Mkt Val (USD)", "Mkt Val (Orig. Ccy)"]) ?? 0;

          const quantity = pick<number>(r, ["quantity", "Quantity"]) ?? "—";
          const issuingBank = r.issuing_bank ?? (description.split(" ")[0] || "Unknown");
          const category =
            r.security_type ??
            tblKey.replace(/_/g, " ") ?? // “Equity Structured Products”
            "—";

          rows.push({
            /* ── 10 desired columns ────────────────────────────────── */
            description, // 1
            market_value_usd: marketValue, // 2
            quantity, // 3
            issuing_bank: issuingBank, // 4
            ...parseStructuredProduct(description), // 5‑8 → tenor / structure / underlying / coupon
            valuation: computeValuation(r), // 9
            category, // 10

            /* ── any extras you still rely on elsewhere (charts…) ── */
            total_cost_usd: r.total_cost_usd, // keeps existing charts happy
            doc_id: doc.id,
          } as ProductRow);
        });
      });
    });

    return rows;
  }, [docs]);

  /* ----------------------- 4️⃣  Column definitions (AG) ---------------------- */
  const columnDefs: ColDef[] = useMemo((): ColDef[] => {
    const minWidth = (label: string) => Math.max(label.length * 8 + 60, 90);

    return [
      { headerName: "Description", field: "description", minWidth: minWidth("Description"), flex: 2 },
      {
        headerName: "Market Value USD",
        field: "market_value_usd",
        minWidth: 150,
        flex: 1,
        valueFormatter: (p) => p.value?.toLocaleString(undefined, { maximumFractionDigits: 0 }),
      },
      {
        headerName: "Quantity",
        field: "quantity",
        minWidth: 120,
        flex: 1,
        valueFormatter: (p) => p.value?.toLocaleString(),
      },
      { headerName: "Issuing Bank", field: "issuing_bank", minWidth: 110, flex: 1 },
      { headerName: "Tenor", field: "tenor", minWidth: 90, flex: 0.8 },
      { headerName: "Structure", field: "structure", minWidth: 110, flex: 1 },
      { headerName: "Underlying", field: "underlying", minWidth: 180, flex: 1.5 },
      { headerName: "Coupon", field: "coupon", minWidth: 90, flex: 0.8 },
      { headerName: "Valuation", field: "valuation", minWidth: 110, flex: 1 },
      { headerName: "Category", field: "category", minWidth: 190, flex: 1.5 },
    ];
  }, []);

  /* ------------------------- 5️⃣  Chart data builders ------------------------ */
  const maturityData = useMemo(() => buildMaturityChartData(productRows), [productRows]);
  const riskData = useMemo(() => buildCounterpartyRiskData(productRows), [productRows]);

  /* ----------------------------- Early exits ------------------------------- */
  if (status === "loading") return <p className="p-6">Loading …</p>;
  if (status === "error") return <p className="p-6 text-red-500">{errorMsg}</p>;

  /* -------------------------------- Render -------------------------------- */
  return (
    <div className="min-h-screen p-6 space-y-10">
      {/* 📊  Charts */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Maturity Ladder */}
        <div className="glass-card rounded-lg p-6">
          <h3 className="text-lg font-semibold text-[#11223D] mb-4">Maturity Ladder</h3>
          <div className="h-96">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={maturityData} margin={{ top: 10, right: 10, left: 10, bottom: 40 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="quarter"
                  tick={{ fontSize: 11, fill: "#11223D" }}
                  stroke="#11223D"
                  angle={-45}
                  textAnchor="end"
                  height={60}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "#11223D" }}
                  stroke="#11223D"
                  label={{ value: "USD MM", angle: -90, position: "insideLeft", style: { textAnchor: "middle" } }}
                />
                <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "10px" }} />

                {Array.from(
                  new Set(productRows.map((r) => r.issuing_bank).filter((bank): bank is string => !!bank))
                ).map((bank, idx) => (
                  <Bar
                    key={bank}
                    dataKey={bank}
                    stackId="a"
                    fill={CHART_COLORS[idx % CHART_COLORS.length]}
                    name={bank}
                    radius={[2, 2, 0, 0]}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Counterparty Risk */}
        <div className="glass-card rounded-lg p-6">
          <h3 className="text-lg font-semibold text-[#11223D] mb-4">Counterparty Risk Distribution</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={riskData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={120}
                  paddingAngle={2}
                  dataKey="value"
                  nameKey="name"
                >
                  {riskData.map((entry, idx) => (
                    <Cell key={`cell-${idx}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  verticalAlign="bottom"
                  height={36}
                  wrapperStyle={{ fontSize: "12px", paddingTop: "10px" }}
                  formatter={(value, entry) => `${value} (${entry.payload?.value || 0}%)`}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* 📑  Structured Products Table */}
      <div className="ag-theme-quartz w-full" style={{ maxHeight: 600 }}>
        <AgGridReact
          rowData={productRows}
          columnDefs={columnDefs}
          animateRows
          domLayout="autoHeight"
          onRowClicked={(e) => setSelectedRow(e.data)}
        />
      </div>

      {/* ⬇  CSV export – optional (plug in your own handler) */}
      <footer className="flex items-center justify-between pt-6 border-t border-white/20">
        <p className="text-sm text-[#11223D]/50">
          Data updated 
          {new Date().toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
        </p>
        <Button variant="outline" className="border-[#11223D]/20 text-[#11223D] hover:bg-[#11223D]/5 wealth-focus">
          Download CSV
        </Button>
      </footer>

      {/* TODO: Hook up your <ProductDrawer> here if desired */}
      {selectedRow && (
        <pre className="fixed bottom-6 right-6 p-4 bg-white shadow-xl rounded-lg max-w-md overflow-auto text-xs">
          {JSON.stringify(selectedRow, null, 2)}
        </pre>
      )}
    </div>
  );
};

export default StructuredProductsPage;

/* -------------------------------------------------------------------------- */
/*                               🔧 UTILITIES                                */
/* -------------------------------------------------------------------------- */

/** Extract counterparty (issuer) name from a row */
function extractCounterparty(row: any): string {
  if (row.issuing_bank) return row.issuing_bank;
  if (row.security_description) return row.security_description.split(" ")[0];
  return "Unknown";
}

/** Try to derive a proper Date from the maturity bits embedded in `Description` */
function extractMaturity(row: any): Date | null {
  if (row.maturity_date) return new Date(row.maturity_date);

  // Fallback: look for 6‑digit date‑like token, e.g. 020925‑USD → 02 Sep 2025
  const match = row.Description?.match(/(\d{2})(\d{2})(\d{2})-/);
  if (match) {
    const [_, dd, mm, yy] = match;
    return new Date(`20${yy}-${mm}-${dd}`); // naive but good enough
  }
  return null;
}

/**
 * Build maturity‑ladder rows: one row per quarter, one column per issuer
 * Values are in *USD millions* for readability (1 000 000 divisor)
 */
function buildMaturityChartData(rows: ProductRow[]) {
  const buckets: Record<string, Record<string, number>> = {};

  rows.forEach((r) => {
    const maturity = extractMaturity(r);
    if (!maturity) return;

    const year = maturity.getFullYear();
    const quarter = Math.floor(maturity.getMonth() / 3) + 1; // 0‑based → 1‑based
    const key = `${year} Q${quarter}`;

    const bank = extractCounterparty(r);
    const amt = r.market_value_usd ?? r.total_cost_usd ?? 0;

    if (!buckets[key]) buckets[key] = {};
    buckets[key][bank] = (buckets[key][bank] || 0) + amt / 1_000_000; // → USD MM
  });

  return Object.entries(buckets)
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([quarter, obj]) => ({ quarter, ...obj }));
}

/**
 * Build counterparty‑risk slices: % share of total market value per issuer
 */
function buildCounterpartyRiskData(rows: ProductRow[]) {
  const totals: Record<string, number> = {};
  let grand = 0;

  rows.forEach((r) => {
    const bank = extractCounterparty(r);
    const amt = r.market_value_usd ?? r.total_cost_usd ?? 0;

    totals[bank] = (totals[bank] || 0) + amt;
    grand += amt;
  });

  return Object.entries(totals).map(([bank, amt], idx) => ({
    name: bank,
    value: +((amt / grand) * 100).toFixed(2),
    color: CHART_COLORS[idx % CHART_COLORS.length],
  }));
}

/** Recharts‑friendly tooltip for pie slices */
const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
        <p className="font-medium text-[#11223D]">{payload[0].name}</p>
        <p className="text-sm text-[#11223D]/70">{payload[0].value}% of total exposure</p>
      </div>
    );
  }
  return null;
};

// Handy “first match” getter – ignores null/undefined/empty   *
export function pick<T>(obj: Record<string, any>, keys: string[]): T | undefined {
  for (const k of keys) {
    const v = obj[k];
    if (v !== undefined && v !== null && v !== "") return v as T;
  }
  return undefined;
}

// Parse tenor / structure / underlying / coupon from 1‑liner  *

export function parseStructuredProduct(descRaw = "") {
  const desc = descRaw.toUpperCase();

  const tenor = desc.match(/(\d{1,2}M)/)?.[1] ?? "—";
  const structure = desc.match(/\b(FCN|DCN|PRTN|CLN|ELN)\b/)?.[1] ?? "—";
  const underlying = desc.split(" - ")[1]?.split(/\s\d/)[0]?.trim() ?? "—";
  const coupon = desc.match(/(\d+(\.\d+)?%)/)?.[1] ?? "—";

  return { tenor, structure, underlying, coupon };
}

// Very light “valuation” label: above / below / at par       *
export function computeValuation(r: Record<string, any>): string {
  const cost = pick<number>(r, ["unit_cost_price", "ave_unit_cost", "Unit Cost Price"]);
  const last = pick<number>(r, ["unit_last_price", "market_price", "Unit Last Price"]);
  if (cost && last) {
    const delta = last / cost - 1;
    if (Math.abs(delta) < 0.002) return "Par";
    return delta > 0 ? "Above par" : "Below par";
  }
  return "—";
}
