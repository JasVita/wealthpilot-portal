"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Plus, Pencil, Trash2 as Trash, Eye, ChevronDown, User, Building2, Banknote } from "lucide-react";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------
   Types & Sample Data
   ------------------------------------------------------------------ */
interface NodeData {
  id: string;
  type: "advisor" | "client" | "entity" | "account";
  name: string;
  value: string;
  children?: NodeData[];
}

const initialHierarchy: NodeData = {
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
            {
              id: "acct-1",
              type: "account",
              name: "Bank of America (095)",
              value: "$1,670,126",
            },
            {
              id: "acct-2",
              type: "account",
              name: "Goldman Sachs (Online)",
              value: "$225,000",
            },
          ],
        },
        {
          id: "entity-2",
          type: "entity",
          name: "Adam Smith Revocable Trust",
          value: "$68,334,029",
          children: [
            {
              id: "acct-3",
              type: "account",
              name: "Malibu Point, LLC",
              value: "$1,927,570",
            },
            {
              id: "acct-4",
              type: "account",
              name: "Smith Investments, LLC",
              value: "$200,009",
            },
          ],
        },
      ],
    },
  ],
};

/* ------------------------------------------------------------------
   Helper Functions
   ------------------------------------------------------------------ */
function generateId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}`;
}

// Recursively update a node by id.
function updateNode(root: NodeData, id: string, updater: (n: NodeData) => void): NodeData {
  if (root.id === id) {
    const copy = { ...root };
    updater(copy);
    return copy;
  }
  if (!root.children) return root;
  return {
    ...root,
    children: root.children.map((c) => updateNode(c, id, updater)),
  };
}

// Recursively delete a node by id and return new tree.
function deleteNode(root: NodeData, id: string): NodeData | null {
  if (root.id === id) return null;
  if (!root.children) return root;
  const filtered = root.children.map((c) => deleteNode(c, id)).filter(Boolean) as NodeData[];
  return { ...root, children: filtered };
}

/* ------------------------------------------------------------------
   TreeNode Component
   ------------------------------------------------------------------ */
function TreeNode({
  node,
  onEdit,
  onDelete,
}: {
  node: NodeData;
  onEdit: (node: NodeData) => void;
  onDelete: (node: NodeData) => void;
}) {
  const [open, setOpen] = useState(true);
  const router = useRouter();
  const iconMap = {
    advisor: User,
    client: User,
    entity: Building2,
    account: Banknote,
  } as const;
  const Icon = iconMap[node.type];

  return (
    <div className="pl-4 border-l border-muted relative">
      <div
        className="flex items-center gap-2 py-2 group hover:bg-muted/20 rounded cursor-pointer"
        onClick={() => setOpen((p) => !p)}
      >
        <ChevronDown
          className={cn(
            "w-4 h-4 shrink-0 transition-transform text-muted-foreground",
            !node.children?.length && "opacity-0",
            !open && "-rotate-90"
          )}
        />
        <Icon className="w-4 h-4 text-muted-foreground shrink-0" />
        <span className="font-medium truncate max-w-[14ch]">{node.name}</span>
        <span className="ml-auto text-sm text-muted-foreground whitespace-nowrap">{node.value}</span>
        {/* ACTIONS */}
        <div
          className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-2 shrink-0"
          onClick={(e) => e.stopPropagation()}
        >
          {node.type === "client" && (
            <Button
              variant="ghost"
              size="icon"
              aria-label="Overview"
              onClick={() => router.push(`/clients/${node.id}`)}
            >
              <Eye className="h-4 w-4" />
            </Button>
          )}
          <Button variant="ghost" size="icon" aria-label="Edit" onClick={() => onEdit(node)}>
            <Pencil className="h-4 w-4" />
          </Button>
          {node.type !== "advisor" && (
            <Button variant="ghost" size="icon" aria-label="Delete" onClick={() => onDelete(node)}>
              <Trash className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
      {open && node.children?.length ? (
        <div className="ml-4 border-l border-dashed border-muted-foreground/40">
          {node.children.map((child) => (
            <TreeNode key={child.id} node={child} onEdit={onEdit} onDelete={onDelete} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------
   Main Page Component
   ------------------------------------------------------------------ */
export default function ClientManagementPage() {
  const [hierarchy, setHierarchy] = useState<NodeData>(initialHierarchy);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<NodeData | null>(null);
  const [form, setForm] = useState({ name: "", value: "" });

  /* ----------------------- CRUD HANDLERS ----------------------- */
  function openCreate() {
    setEditing(null);
    setForm({ name: "", value: "" });
    setDialogOpen(true);
  }

  function openEdit(node: NodeData) {
    setEditing(node);
    setForm({ name: node.name, value: node.value });
    setDialogOpen(true);
  }

  function handleSave() {
    if (editing) {
      // Update existing node
      setHierarchy((h) =>
        updateNode(h, editing.id, (n) => {
          n.name = form.name;
          n.value = form.value;
        })
      );
    } else {
      // Create new client under root advisor
      const newNode: NodeData = {
        id: generateId("client"),
        type: "client",
        name: form.name || "New Client",
        value: form.value || "$0",
        children: [],
      };
      setHierarchy((h) => ({ ...h, children: [...(h.children || []), newNode] }));
    }
    setDialogOpen(false);
  }

  function handleDelete(node: NodeData) {
    if (confirm(`Delete ${node.name}? This action cannot be undone.`)) {
      setHierarchy((h) => deleteNode(h, node.id) || h);
    }
  }

  return (
    <div className="p-6 space-y-6">
      {/* PAGE HEADER */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Client Management</h1>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Add Client
        </Button>
      </div>

      {/* TREE DASHBOARD */}
      <Card>
        <CardHeader>
          <CardTitle>Ownership Hierarchy</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <TreeNode node={hierarchy} onEdit={openEdit} onDelete={handleDelete} />
        </CardContent>
      </Card>

      {/* CREATE / EDIT DIALOG */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Client" : "New Client"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <Input
              placeholder="Client name"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
            <Input
              placeholder="Total value (e.g. $1,000,000)"
              value={form.value}
              onChange={(e) => setForm((f) => ({ ...f, value: e.target.value }))}
            />
          </div>
          <div className="flex justify-end gap-2 mt-6">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>{editing ? "Save" : "Create"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
