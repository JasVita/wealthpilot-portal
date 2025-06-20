"use client";

import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface TimelineItemProps {
  icon?: React.ElementType;
  children: ReactNode;
  className?: string;
}

export function TimelineItem({ icon: Icon, children, className }: TimelineItemProps) {
  return (
    <div className={cn("relative pl-8 border-l border-muted py-4", className)}>
      {Icon && (
        <div className="absolute -left-[14px] top-4 bg-background border rounded-full p-1 shadow-sm">
          <Icon className="w-4 h-4 text-primary" />
        </div>
      )}
      <div className="text-sm text-muted-foreground">{children}</div>
    </div>
  );
}
