import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  mockLifecycleEvents,
  mockClientDistribution,
  mockProductDistribution,
  totalSPPosition,
  totalAmount,
  type LifecycleEvent,
  type ClientDistribution,
  type ProductDistribution,
} from "@/data/sp-lifecycle-data";

type TimePeriod = "last-7-days" | "last-30-days" | "last-90-days" | "last-year";
type SortOrder = "asc" | "desc";
type SortField = "clientNo" | "position" | "totalAmount";

interface SPLifecycleState {
  timePeriod: TimePeriod;
  lastUpdated: string;
  sortField: SortField;
  sortOrder: SortOrder;
  lifecycleEvents: LifecycleEvent[];
  clientDistribution: ClientDistribution[];
  productDistribution: ProductDistribution[];

  // Actions
  setTimePeriod: (period: TimePeriod) => void;
  setSorting: (field: SortField, order: SortOrder) => void;
  getSortedClientDistribution: () => ClientDistribution[];
  getTotalSPPosition: () => number;
  getTotalAmount: () => number;
}

export const useSPLifecycleStore = create<SPLifecycleState>()(
  persist(
    (set, get) => ({
      timePeriod: "last-30-days",
      lastUpdated: new Date().toLocaleString(),
      sortField: "clientNo",
      sortOrder: "asc",
      lifecycleEvents: mockLifecycleEvents,
      clientDistribution: mockClientDistribution,
      productDistribution: mockProductDistribution,

      setTimePeriod: (period) => {
        set({
          timePeriod: period,
          lastUpdated: new Date().toLocaleString(),
        });
      },

      setSorting: (field, order) => {
        set({ sortField: field, sortOrder: order });
      },

      getSortedClientDistribution: () => {
        const { clientDistribution, sortField, sortOrder } = get();
        return [...clientDistribution].sort((a, b) => {
          let aValue: string | number = a[sortField];
          let bValue: string | number = b[sortField];

          if (typeof aValue === "string") {
            aValue = aValue.toLowerCase();
            bValue = (bValue as string).toLowerCase();
          }

          if (sortOrder === "asc") {
            return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
          } else {
            return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
          }
        });
      },

      getTotalSPPosition: () => totalSPPosition,
      getTotalAmount: () => totalAmount,
    }),
    {
      name: "sp-lifecycle-storage",
    }
  )
);
