import { create } from "zustand";
import { persist } from "zustand/middleware";
import { TradeRetrocessionData, mockTradeRetrocessionData } from "@/data/trade-retrocession-data";

export type TimePeriod = "last-7-days" | "last-30-days" | "last-90-days" | "last-year" | "custom";

interface TradeRetrocessionStore {
  data: TradeRetrocessionData[];
  filteredData: TradeRetrocessionData[];
  searchQuery: string;
  timePeriod: TimePeriod;
  customDateRange: {
    from?: Date;
    to?: Date;
  };
  currentPage: number;
  itemsPerPage: number;

  // Actions
  setSearchQuery: (query: string) => void;
  setTimePeriod: (period: TimePeriod) => void;
  setCustomDateRange: (range: { from?: Date; to?: Date }) => void;
  setCurrentPage: (page: number) => void;
  filterData: () => void;
  getTotalPages: () => number;
  getCurrentPageData: () => TradeRetrocessionData[];
  getSummaryTotals: () => {
    totalNetAssets: number;
    totalCommission: number;
    totalRevenue: number;
    avgRetrocession: number;
  };
}

export const useTradeRetrocessionStore = create<TradeRetrocessionStore>()(
  persist(
    (set, get) => ({
      data: mockTradeRetrocessionData,
      filteredData: mockTradeRetrocessionData,
      searchQuery: "",
      timePeriod: "last-30-days",
      customDateRange: {},
      currentPage: 1,
      itemsPerPage: 7,

      setSearchQuery: (query: string) => {
        set({ searchQuery: query, currentPage: 1 });
        get().filterData();
      },

      setTimePeriod: (period: TimePeriod) => {
        set({ timePeriod: period, currentPage: 1 });
        get().filterData();
      },

      setCustomDateRange: (range: { from?: Date; to?: Date }) => {
        set({ customDateRange: range, currentPage: 1 });
        get().filterData();
      },

      setCurrentPage: (page: number) => {
        set({ currentPage: page });
      },

      filterData: () => {
        const { data, searchQuery } = get();
        let filtered = data;

        // Apply search filter
        if (searchQuery.trim()) {
          filtered = filtered.filter(
            (item) =>
              item.client.toLowerCase().includes(searchQuery.toLowerCase()) ||
              item.rm.toLowerCase().includes(searchQuery.toLowerCase()) ||
              item.account.toLowerCase().includes(searchQuery.toLowerCase())
          );
        }

        set({ filteredData: filtered });
      },

      getTotalPages: () => {
        const { filteredData, itemsPerPage } = get();
        return Math.ceil(filteredData.length / itemsPerPage);
      },

      getCurrentPageData: () => {
        const { filteredData, currentPage, itemsPerPage } = get();
        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        return filteredData.slice(startIndex, endIndex);
      },

      getSummaryTotals: () => {
        const { filteredData } = get();
        const totalNetAssets = filteredData.reduce((sum, item) => sum + item.netAssetsValue, 0);
        const totalCommission = filteredData.reduce((sum, item) => sum + item.commission, 0);
        const totalRevenue = filteredData.reduce((sum, item) => sum + item.revenue, 0);
        const avgRetrocession =
          filteredData.length > 0
            ? filteredData.reduce((sum, item) => sum + item.retrocession, 0) / filteredData.length
            : 0;

        return {
          totalNetAssets,
          totalCommission,
          totalRevenue,
          avgRetrocession,
        };
      },
    }),
    {
      name: "trade-retrocession-storage",
    }
  )
);
