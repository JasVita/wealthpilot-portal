"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Plus, Pencil, Trash2 as Trash, Eye, ChevronDown, User, Building2, Banknote } from "lucide-react";
import { cn } from "@/lib/utils";
import { useClientStore } from "@/stores/clients-store";
import { toast } from "sonner";

interface NodeData {
  id: string;
  type: "advisor" | "client" | "entity" | "account";
  name: string;
  value: string;
  children?: NodeData[];
}
const generateId = (p: string) => `${p}-${Math.random().toString(36).slice(2, 8)}`;

function TreeNode({
  node,
  onEdit,
  onDelete,
}: {
  node: NodeData;
  onEdit: (n: NodeData) => void;
  onDelete: (n: NodeData) => void;
}) {
  const [open, setOpen] = useState(true);
  const router = useRouter();
  const Icon = { advisor: User, client: User, entity: Building2, account: Banknote }[node.type];
  const hasChildren = (node.children?.length ?? 0) > 0; // ✅ boolean
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
        {/* <span className="ml-auto text-sm text-muted-foreground whitespace-nowrap">{node.value}</span> */}

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
                router.push("/clients/overview"); // ✅ redirect to overview
              }}
            >
              <Eye className="h-4 w-4" />
            </Button>
          )}
          <Button variant="ghost" size="icon" onClick={() => onEdit(node)}>
            <Pencil className="h-4 w-4" />
          </Button>
          {node.type !== "advisor" && (
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

export default function ClientManagementPage() {
  // const [clients, setClients] = useState<NodeData[]>([seedClient]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<NodeData | null>(null);
  const [form, setForm] = useState({ name: "", value: "" });
  const { clients: storeClients, order, addClient, deleteClient, updateClient } = useClientStore();
  const clients = useMemo(
    () =>
      order.map((id) => ({
        id,
        type: "client",
        name: storeClients[id].name,
        value: "$0",
        children: [], // fill later when you add entities/accounts
      })),
    [storeClients, order]
  );
  /* ---------- dialog helpers ---------- */
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

  /* ---------- CRUD ---------- */
  const handleSave = async () => {
    if (editing) {
      // setClients((f) =>
      //   updateForest(f, editing.id, (n) => {
      //     n.name = form.name;
      //     n.value = form.value;
      //   })
      // );
      try {
        await updateClient(editing.id, { name: form.name });
        toast.success("Client updated 🎉");
      } catch (err: any) {
        toast.error(err.message || "Update failed");
      }
    } else {
      const newNode: NodeData = {
        id: generateId("client"),
        type: "client",
        name: form.name || "New Client",
        value: "$0",
        children: [],
      };
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

  /* ---------- UI ---------- */
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

      {/* Dialog (unchanged except for title) */}
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
            {/* <Input
              placeholder="Total value"
              value={form.value}
              onChange={(e) => setForm((f) => ({ ...f, value: e.target.value }))}
            /> */}
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
