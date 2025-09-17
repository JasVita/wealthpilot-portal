import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * Global filters for the header bar (periods & selection).
 * periods: list of YYYY-MM-DD the backend exposes
 * fromDate/toDate: current range (or null)
 * account: selected account number (or "ALL")
 */
type ClientFiltersState = {
  periods: string[];
  fromDate: string | null;
  toDate: string | null;
  account: string; // "ALL" means no account filter

  setPeriods: (p: string[]) => void;
  setFromDate: (d: string | null) => void;
  setToDate: (d: string | null) => void;
  setAccount: (a: string) => void;
  reset: () => void;
};

export const useClientFiltersStore = create<ClientFiltersState>()(
  persist(
    (set) => ({
      periods: [],
      fromDate: null,
      toDate: null,
      account: "ALL",

      setPeriods: (p) => set({ periods: Array.isArray(p) ? p : [] }),
      setFromDate: (d) => set({ fromDate: d }),
      setToDate: (d) => set({ toDate: d }),
      setAccount: (a) => set({ account: a || "ALL" }),
      reset: () => set({ periods: [], fromDate: null, toDate: null, account: "ALL" }),
    }),
    { name: "client-filters", version: 2 }
  )
);
