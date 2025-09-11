import * as React from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function PillTabs({
  value,
  onChange,
  allCount,
  pills,
  counts,
  className,
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
      <TabsList className="h-8 flex flex-wrap gap-2">
        <TabsTrigger value="ALL" className="text-xs">
          ALL ({allCount})
        </TabsTrigger>
        {pills.map((p) => (
          <TabsTrigger key={p} value={p} className="text-xs">
            {p} ({counts.get(p) ?? 0})
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
