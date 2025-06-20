"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronDown, User, Building2, Banknote } from "lucide-react";
import { cn } from "@/lib/utils";

interface NodeData {
  id: string;
  type: "advisor" | "client" | "entity" | "account";
  name: string;
  value: string;
  children?: NodeData[];
}

const hierarchy: NodeData = {
  id: "advisor-1",
  type: "advisor",
  name: "Jane Advisor",
  value: "Firm: WealthPilot Capital",
  children: [
    {
      id: "client-1",
      type: "client",
      name: "Adam Smith",
      value: "$145,552,283",
      children: [
        {
          id: "entity-1",
          type: "entity",
          name: "Adam Smith Trust",
          value: "$77,218,254",
          children: [
            { id: "acct-1", type: "account", name: "Bank of America (095)", value: "$1,670,126" },
            { id: "acct-2", type: "account", name: "Goldman Sachs (Online)", value: "$225,000" },
          ],
        },
        {
          id: "entity-2",
          type: "entity",
          name: "Adam Smith Revocable Trust",
          value: "$68,334,029",
          children: [
            { id: "acct-3", type: "account", name: "Malibu Point, LLC", value: "$1,927,570" },
            { id: "acct-4", type: "account", name: "Smith Investments, LLC", value: "$200,009" },
          ],
        },
      ],
    },
  ],
};

function TreeNode({ node }: { node: NodeData }) {
  const [open, setOpen] = useState(true);
  const iconMap = {
    advisor: User,
    client: User,
    entity: Building2,
    account: Banknote,
  };
  const Icon = iconMap[node.type];

  return (
    <div className="pl-4 border-l border-muted relative">
      <div className="flex items-center gap-2 py-2 cursor-pointer group" onClick={() => setOpen((prev) => !prev)}>
        <ChevronDown
          className={cn("w-4 h-4 transition-transform", !node.children?.length && "opacity-0", !open && "-rotate-90")}
        />
        <Icon className="w-4 h-4 text-muted-foreground" />
        <span className="font-medium">{node.name}</span>
        <span className="ml-auto text-sm text-muted-foreground">{node.value}</span>
      </div>
      {open && node.children?.length && (
        <div className="ml-2 border-l border-dashed border-gray-300">
          {node.children.map((child) => (
            <TreeNode key={child.id} node={child} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function DashboardPage() {
  return (
    <main className="max-w-6xl mx-auto px-4 sm:px-8 md:px-12 xl:px-24 py-12">
      <h1 className="text-4xl font-semibold mb-8">Firm-wide Dashboard</h1>
      <Card>
        <CardHeader>
          <CardTitle>Ownership Hierarchy</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <TreeNode node={hierarchy} />
        </CardContent>
      </Card>
    </main>
  );
}
