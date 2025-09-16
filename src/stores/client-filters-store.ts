import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * Global filters for the “header bar” (custodian periods).
 * periods: list of YYYY-MM-DD strings the backend exposes
 * fromDate/toDate: currently selected range (or null)
 */
type ClientFiltersState = {
  periods: string[];
  fromDate: string | null;
  toDate: string | null;

  setPeriods: (p: string[]) => void;
  setFromDate: (d: string | null) => void;
  setToDate: (d: string | null) => void;
  reset: () => void;
};

export const useClientFiltersStore = create<ClientFiltersState>()(
  persist(
    (set) => ({
      periods: [],
      fromDate: null,
      toDate: null,

      setPeriods: (p) => set({ periods: Array.isArray(p) ? p : [] }),
      setFromDate: (d) => set({ fromDate: d }),
      setToDate: (d) => set({ toDate: d }),
      reset: () => set({ periods: [], fromDate: null, toDate: null }),
    }),
    { name: "client-filters" }
  )
);
