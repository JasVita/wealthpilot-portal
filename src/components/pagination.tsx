// src/components/pagination.tsx
"use client";

import * as React from "react";
import { ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import clsx from "clsx";

type PageItem = number | "…";

function buildCompactPages(totalPages: number, current: number): PageItem[] {
  const max = Math.max(1, totalPages);
  const cur = Math.min(Math.max(1, current), max);

  if (max <= 5) {
    return Array.from({ length: max }, (_, i) => i + 1);
  }

  // Spec: 1, (cur-1), cur, (cur+1), …, (max-1), max
  const nums = new Set<number>([
    1,
    cur - 1,
    cur,
    cur + 1,
    max - 1,
    max,
  ]);

  // Clamp to valid range
  const filtered = Array.from(nums)
    .filter((n) => n >= 1 && n <= max)
    .sort((a, b) => a - b);

  // Insert "…" where gaps > 1
  const items: PageItem[] = [];
  for (let i = 0; i < filtered.length; i++) {
    const n = filtered[i];
    if (i > 0 && n - filtered[i - 1] > 1) items.push("…");
    items.push(n);
  }
  return items;
}

export function Pagination({
  page,
  total,
  pageSize,
  totalPages,
  onChange,
  className,
}: {
  page: number;
  total: number;
  pageSize: number;
  /** Optional; if omitted we compute from total/pageSize */
  totalPages?: number;
  onChange: (nextPage: number) => void;
  className?: string;
}) {
  const tp = React.useMemo(
    () => Math.max(1, totalPages ?? Math.ceil((total || 0) / Math.max(1, pageSize))),
    [totalPages, total, pageSize]
  );

  const firstRow = (page - 1) * pageSize + 1;
  const lastRow = Math.min(page * pageSize, total);
  const pageItems = React.useMemo(() => buildCompactPages(tp, page), [tp, page]);

  const canPrev = page > 1;
  const canNext = page < tp;

  return (
    <div className={clsx("flex flex-col gap-3 md:flex-row md:items-center md:justify-between py-3 border-t mt-2", className)}>
      {/* Left: range info */}
      <div className="text-xs text-muted-foreground">
        {total > 0 ? (
          <>
            Showing{" "}
            <span className="font-medium">
              {firstRow.toLocaleString()}–{lastRow.toLocaleString()}
            </span>{" "}
            of <span className="font-medium">{total.toLocaleString()}</span> rows
          </>
        ) : (
          "No rows"
        )}
      </div>

      {/* Right: controls */}
      <div className="flex items-center gap-1 md:gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onChange(1)}
          disabled={!canPrev}
          className="hidden sm:inline-flex"
          aria-label="First page"
        >
          <ChevronsLeft className="h-4 w-4" />
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={() => onChange(Math.max(1, page - 1))}
          disabled={!canPrev}
          aria-label="Previous page"
        >
          <ChevronLeft className="h-4 w-4" />
          <span className="ml-1 hidden sm:inline">Prev</span>
        </Button>

        {pageItems.map((p, idx) =>
          p === "…" ? (
            <span key={`gap-${idx}`} className="px-2 text-muted-foreground select-none">…</span>
          ) : (
            <Button
              key={p}
              variant={p === page ? "default" : "outline"}
              size="sm"
              onClick={() => onChange(p)}
              aria-current={p === page ? "page" : undefined}
            >
              {p}
            </Button>
          )
        )}

        <Button
          variant="outline"
          size="sm"
          onClick={() => onChange(Math.min(tp, page + 1))}
          disabled={!canNext}
          aria-label="Next page"
        >
          <span className="mr-1 hidden sm:inline">Next</span>
          <ChevronRight className="h-4 w-4" />
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={() => onChange(tp)}
          disabled={!canNext}
          className="hidden sm:inline-flex"
          aria-label="Last page"
        >
          <ChevronsRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
