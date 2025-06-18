import { create } from "zustand";
import { persist } from "zustand/middleware";

const standardCharteredTable = {
  columns: ["asset_type", "description", "value_usd", "currency", "quantity", "valuation_date"],
  rows: [
    {
      asset_type: "Cash",
      description: "USD Demand IB Account - 5500516704",
      value_usd: 423372.67,
      currency: "USD",
      quantity: null,
      valuation_date: "30-Apr-2025",
    },
    {
      asset_type: "Bond",
      description: "HSBC Holdings 7.336% 03 NOV 2026",
      value_usd: 253053.75,
      currency: "USD",
      quantity: 250000,
      valuation_date: "30-Apr-2025",
    },
    {
      asset_type: "Bond",
      description: "Goldman Sachs GP 4.8% 08 JUL 2044",
      value_usd: 221312.5,
      currency: "USD",
      quantity: 250000,
      valuation_date: "30-Apr-2025",
    },
    {
      asset_type: "Equity",
      description: "Microsoft Corp",
      value_usd: 217393.0,
      currency: "USD",
      quantity: 550,
      valuation_date: "30-Apr-2025",
    },
    {
      asset_type: "Equity",
      description: "Amazon.com Inc.",
      value_usd: 217615.6,
      currency: "USD",
      quantity: 1180,
      valuation_date: "30-Apr-2025",
    },
    {
      asset_type: "Equity",
      description: "NVIDIA Corp",
      value_usd: 187342.4,
      currency: "USD",
      quantity: 1720,
      valuation_date: "30-Apr-2025",
    },
    {
      asset_type: "Mutual Fund",
      description: "PIMCO Income Fund (CLASS-E-USD-CASH)",
      value_usd: 903645.23,
      currency: "USD",
      quantity: 95120.551,
      valuation_date: "29-Apr-2025",
    },
    {
      asset_type: "Mutual Fund",
      description: "ACMBERNSTEIN American Income PF",
      value_usd: 906288.75,
      currency: "USD",
      quantity: 140509.884,
      valuation_date: "29-Apr-2025",
    },
    {
      asset_type: "Alternative Investment",
      description: "Antarctica Global Fund PLC ACCUM SHS AR",
      value_usd: 650588.87,
      currency: "USD",
      quantity: 5702.42,
      valuation_date: "01-Mar-2025",
    },
    {
      asset_type: "Structured Product",
      description: "UBS FCN SPYP+QQQOQ 14JUL25",
      value_usd: 381598.4,
      currency: "USD",
      quantity: 400000,
      valuation_date: "30-Apr-2025",
    },
  ],
};

interface TableDoc {
  id: string;
  data: any; // expected to match mockData
}

interface TableStore {
  selectedId: string | null;
  tableDocs: TableDoc[];
  setSelectedId: (id: string) => void;
  uploadMockTable: () => Promise<void>;
  fetchTableById: (id: string) => Promise<void>;
}

export const useTableStore = create<TableStore>()(
  persist(
    (set, get) => ({
      selectedId: null,
      tableDocs: [],

      setSelectedId: (id) => set({ selectedId: id }),

      uploadMockTable: async () => {
        const randomized = {
          ...standardCharteredTable,
          rows: standardCharteredTable.rows.map((row) => ({
            ...row,
            value_usd: Math.floor(Math.random() * 500000) + 50000,
          })),
        };

        const res = await fetch("/api/add-doc", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mockData: randomized }),
        });

        if (!res.ok) throw new Error("Upload failed");

        const { sk } = await res.json(); // Await the JSON response to access the id
        set((state) => ({
          tableDocs: [...state.tableDocs, { id: sk, data: randomized }],
          selectedId: sk,
        }));
      },

      fetchTableById: async (id: string) => {
        const res = await fetch(`/api/get-doc?id=${id}`);
        if (!res.ok) throw new Error("Fetch failed");
        const data = await res.json();

        set((state) => ({
          selectedId: id,
          tableDocs: [...state.tableDocs.filter((d) => d.id !== id), { id, data }],
        }));
      },
    }),
    { name: "table-doc-store" }
  )
);
