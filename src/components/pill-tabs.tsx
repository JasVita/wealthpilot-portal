import * as React from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

/**
 * Wrap-friendly pills with counts.
 * - No fixed height (h-auto)
 * - flex (not inline-flex), flex-wrap
 * - full width so it can wrap within the page layout
 * - each trigger is shrink-0 so text never squishes
 */
export function PillTabs({
  value,
  onChange,
  allCount,
  pills,
  counts,
  className = "",
}: {
  value: string;
  onChange: (v: string) => void;
  allCount: number;
  pills: string[];
  counts: Map<string, number>;
  className?: string;
}) {
  return (
    <Tabs value={value} onValueChange={onChange} className={className}>
      {/* Use flex + flex-wrap + w-full. Avoid fixed heights. */}
      <TabsList
        className="
          flex flex-wrap w-full h-auto gap-2 p-1
          rounded-md bg-muted/60 text-muted-foreground
        "
      >
        <TabsTrigger value="ALL" className="text-xs shrink-0">
          ALL ({allCount})
        </TabsTrigger>
        {pills.map((p) => (
          <TabsTrigger key={p} value={p} className="text-xs shrink-0">
            {p} ({counts.get(p) ?? 0})
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
