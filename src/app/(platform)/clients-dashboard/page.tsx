"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Plus, Pencil, Trash2 as Trash, Eye, ChevronDown, User, Building2, Banknote } from "lucide-react";
import { cn } from "@/lib/utils";
import { useClientStore } from "@/stores/clients-store";
import { toast } from "sonner";

/* -------------------------------------------------------------------------- */
/*                                   Types                                    */
/* -------------------------------------------------------------------------- */

interface NodeData {
  id: string;
  type: "advisor" | "client" | "entity" | "account";
  name: string;
  /** formatted value string, e.g. "$12 345 678" */
  value: string;
  children?: NodeData[];
}

/* -------------------------------------------------------------------------- */
/*                               Helper utils                                 */
/* -------------------------------------------------------------------------- */

const generateId = (p: string) => `${p}-${Math.random().toString(36).slice(2, 8)}`;

const moneyFmt = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

/* -------------------------------------------------------------------------- */
/*                                 Tree node                                  */
/* -------------------------------------------------------------------------- */

function TreeNode({
  node,
  onEdit,
  onDelete,
}: {
  node: NodeData;
  onEdit: (n: NodeData) => void;
  onDelete: (n: NodeData) => void;
}) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const Icon =
    {
      advisor: User,
      client: User,
      entity: Building2,
      account: Banknote,
    }[node.type] || User;
  const hasChildren = (node.children?.length ?? 0) > 0;
  const { setCurrClient } = useClientStore();

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

        {/* actions */}
        <div
          className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-2 shrink-0"
          onClick={(e) => e.stopPropagation()}
        >
          {node.type === "client" && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                setCurrClient(node.id);
                router.push("/clients/overview");
              }}
            >
              <Eye className="h-4 w-4" />
            </Button>
          )}
          {node.type !== "advisor" && (
            <Button variant="ghost" size="icon" onClick={() => onEdit(node)}>
              <Pencil className="h-4 w-4" />
            </Button>
          )}
          {node.type !== "advisor" && node.type !== "entity" && (
            <Button variant="ghost" size="icon" onClick={() => onDelete(node)}>
              <Trash className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {open && hasChildren && (
        <div className="ml-4 border-l border-dashed border-muted-foreground/40">
          {node.children!.map((child) => (
            <TreeNode key={child.id} node={child} onEdit={onEdit} onDelete={onDelete} />
          ))}
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                           Page component body                               */
/* -------------------------------------------------------------------------- */

export default function ClientManagementPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<NodeData | null>(null);
  const [form, setForm] = useState({ name: "", value: "" });
  const { clients: storeClients, order, addClient, deleteClient, updateClient, loadClients } = useClientStore();

  useEffect(() => {
    loadClients();
  }, []);

  /* ---------------------- build tree from pieChartData --------------------- */
  const clients: NodeData[] = useMemo(() => {
    return order.map((id) => {
      const c = storeClients[id];
      const pie = c.pieChartData;

      // Default values
      let total = 0;
      let children: NodeData[] = [];

      if (pie && Array.isArray(pie.charts)) {
        const aum = pie.charts.find((ch) => ch.title === "AUM_ratio") ?? pie.charts[0];
        if (aum) {
          total = aum.data.reduce((acc: number, v: number) => acc + v, 0);
          children = aum.labels.map((label: string, idx: number) => ({
            id: `${id}-bank-${idx}`,
            type: "entity",
            name: label,
            value: moneyFmt.format(aum.data[idx] ?? 0),
            children: [],
          }));
        }
      }

      return {
        id,
        type: "client",
        name: c.name,
        value: moneyFmt.format(total),
        children,
      } as NodeData;
    });
  }, [storeClients, order]);

  /* ---------------------------- dialog helpers ----------------------------- */
  const openCreate = () => {
    setEditing(null);
    setForm({ name: "", value: "" });
    setDialogOpen(true);
  };
  const openEdit = (n: NodeData) => {
    setEditing(n);
    setForm({ name: n.name, value: n.value });
    setDialogOpen(true);
  };

  /* -------------------------------- CRUD ---------------------------------- */
  const handleSave = async () => {
    if (editing) {
      try {
        await updateClient(editing.id, { name: form.name });
        toast.success("Client updated 🎉");
      } catch (err: any) {
        toast.error(err.message || "Update failed");
      }
    } else {
      try {
        await addClient(form.name);
        toast.success("Client created 🎉");
      } catch (err: any) {
        toast.error(err.message || "Create failed");
      }
    }
    setDialogOpen(false);
  };

  const handleDelete = async (n: NodeData) => {
    if (confirm(`Delete ${n.name}?`)) {
      try {
        await deleteClient(n.id);
        toast.success("Client deleted 🗑️");
      } catch (err: any) {
        toast.error(err.message || "Delete failed");
      }
    }
  };

  /* -------------------------------- Render -------------------------------- */
  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between">
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Add Client
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Existing clients:</CardTitle>
        </CardHeader>
        <CardContent>
          {clients.map((root) => (
            <TreeNode key={root.id} node={{ ...root, type: "client" }} onEdit={openEdit} onDelete={handleDelete} />
          ))}
        </CardContent>
      </Card>

      {/* Dialog */}
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
