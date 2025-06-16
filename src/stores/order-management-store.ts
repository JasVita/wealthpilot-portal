import { create } from "zustand";
import { persist } from "zustand/middleware";
import { mockOrderData, OrderData } from "@/data/order-management-data";

type ProductFilter = "All" | "Equity" | "Fund" | "Bond" | "FX" | "Structured Products" | "Others";
type StatusTab = "All" | "Pending Place" | "Processing" | "Executing" | "Partially Done" | "Done";

interface OrderManagementState {
  // Data
  orders: OrderData[];
  filteredOrders: OrderData[];

  // Filters
  productFilter: ProductFilter;
  statusTab: StatusTab;
  searchQuery: string;

  // Pagination
  currentPage: number;
  itemsPerPage: number;

  // Actions
  setProductFilter: (filter: ProductFilter) => void;
  setStatusTab: (tab: StatusTab) => void;
  setSearchQuery: (query: string) => void;
  setCurrentPage: (page: number) => void;
  filterOrders: () => void;
  getCurrentPageData: () => OrderData[];
  getTotalPages: () => number;
  getStatusCounts: () => Record<StatusTab, number>;
  getTotalOrders: () => number;
}

export const useOrderManagementStore = create<OrderManagementState>()(
  persist(
    (set, get) => ({
      // Initial state
      orders: mockOrderData,
      filteredOrders: mockOrderData,
      productFilter: "All",
      statusTab: "All",
      searchQuery: "",
      currentPage: 1,
      itemsPerPage: 10,

      // Actions
      setProductFilter: (filter) => {
        set({ productFilter: filter, currentPage: 1 });
        get().filterOrders();
      },

      setStatusTab: (tab) => {
        set({ statusTab: tab, currentPage: 1 });
        get().filterOrders();
      },

      setSearchQuery: (query) => {
        set({ searchQuery: query, currentPage: 1 });
        get().filterOrders();
      },

      setCurrentPage: (page) => {
        set({ currentPage: page });
      },

      filterOrders: () => {
        const { orders, productFilter, statusTab, searchQuery } = get();

        let filtered = [...orders];

        // Filter by product type
        if (productFilter !== "All") {
          filtered = filtered.filter((order) => order.productType === productFilter);
        }

        // Filter by status
        if (statusTab !== "All") {
          filtered = filtered.filter((order) => order.status === statusTab);
        }

        // Filter by search query
        if (searchQuery.trim()) {
          const query = searchQuery.toLowerCase();
          filtered = filtered.filter(
            (order) =>
              order.endClient.toLowerCase().includes(query) ||
              order.am.toLowerCase().includes(query) ||
              order.product.toLowerCase().includes(query) ||
              order.accountNoSubaccount.toLowerCase().includes(query)
          );
        }

        set({ filteredOrders: filtered });
      },

      getCurrentPageData: () => {
        const { filteredOrders, currentPage, itemsPerPage } = get();
        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        return filteredOrders.slice(startIndex, endIndex);
      },

      getTotalPages: () => {
        const { filteredOrders, itemsPerPage } = get();
        return Math.ceil(filteredOrders.length / itemsPerPage);
      },

      getStatusCounts: () => {
        const { orders } = get();
        const counts = {
          All: orders.length,
          "Pending Place": 0,
          Processing: 0,
          Executing: 0,
          "Partially Done": 0,
          Done: 0,
        };

        orders.forEach((order) => {
          counts[order.status]++;
        });

        return counts;
      },

      getTotalOrders: () => {
        const { filteredOrders } = get();
        return filteredOrders.length;
      },
    }),
    {
      name: "order-management-storage",
    }
  )
);
