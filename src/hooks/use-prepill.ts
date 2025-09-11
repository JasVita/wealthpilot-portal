import { useEffect, useMemo } from "react";

export type PrePillOptions<T> = {
  /** full dataset */
  rows: T[];

  /** how to read the pill key from a row (e.g. row.assetClass or row.category) */
  pillKey: (row: T) => string | null | undefined;

  /** current active pill value ("ALL" or a value returned by pillKey) */
  activePill: string;

  /** state setter for the active pill (used to auto-reset to ALL) */
  setActivePill: (v: string) => void;

  /** free-text search; if provided, `searchFn` must also be provided */
  search?: string;

  /** build the lowercased search haystack for a row */
  searchFn?: (row: T) => string;

  /**
   * any additional boolean predicates that must pass
   * (e.g., bank/account/CCY filters, date filters, etc.)
   */
  extraFilters?: Array<(row: T) => boolean>;

  /** optional sort for pill labels (defaults to alpha) */
  pillSort?: (a: string, b: string) => number;
};

export function usePrePill<T>({ rows, pillKey, activePill, setActivePill, search, searchFn, extraFilters = [], pillSort }: PrePillOptions<T>) {
  // 1) apply every filter EXCEPT the pill
  const preFiltered = useMemo(() => {
    return rows.filter((r) => {
      for (const f of extraFilters) if (!f(r)) return false;
      if (search && searchFn) {
        if (!searchFn(r).includes(search.toLowerCase())) return false;
      }
      return true;
    });
  }, [rows, extraFilters, search, searchFn]);

  // 2) counts per pill value
  const countsMap = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of preFiltered) {
      const k = pillKey(r);
      const key = k ? String(k) : "—";
      m.set(key, (m.get(key) ?? 0) + 1);
    }
    return m;
  }, [preFiltered, pillKey]);

  // 3) pill list
  const pills = useMemo(() => {
    const arr = Array.from(countsMap.keys());
    return pillSort ? arr.sort(pillSort) : arr.sort();
  }, [countsMap, pillSort]);

  const allCount = preFiltered.length;

  // 4) keep active pill valid
  useEffect(() => {
    if (activePill !== "ALL" && !countsMap.has(activePill)) {
      setActivePill("ALL");
    }
  }, [activePill, countsMap, setActivePill]);

  // 5) final filter (apply the pill)
  const filtered = useMemo(() => {
    return preFiltered.filter((r) =>
      activePill === "ALL" ? true : (pillKey(r) ?? "—") === activePill
    );
  }, [preFiltered, activePill, pillKey]);

  return { preFiltered, countsMap, pills, allCount, filtered };
}
