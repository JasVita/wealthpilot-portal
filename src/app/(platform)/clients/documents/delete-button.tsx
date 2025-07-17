import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Loader2, Trash2 } from "lucide-react";
import type { Doc } from "./page";
import { fmtDate } from "./page";
import { useClientStore } from "@/stores/clients-store";
import { toast } from "sonner";
import axios from "axios";

export default function DeleteButton({ doc, docs, setDocs }: { doc: Doc; docs: Doc[]; setDocs: any }) {
  const [open, setOpen] = useState(false);
  const { currClient } = useClientStore();

  const deleteDocument = async (doc: Doc) => {
    if (!currClient) {
      toast.error("No client selected.");
      return;
    }

    const previousDocs = docs;
    setDocs((prev: any[]) => prev.filter((d) => d.id !== doc.id));

    const toastId = toast("Deleting document…", {
      duration: Infinity,
      icon: <Loader2 className="animate-spin" />,
    });

    try {
      const { data } = await axios.post<{
        task_id: string;
      }>(`${process.env.NEXT_PUBLIC_API_URL}/delete_documents`, {
        doc_ids: [doc.id],
        client_id: currClient,
      });

      const taskId = data.task_id;

      const pollInterval = setInterval(async () => {
        try {
          const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/delete_documents/${taskId}`, {
            validateStatus: () => true,
          });

          if (res.status !== 202) {
            clearInterval(pollInterval);
            toast.dismiss(toastId);

            if (res.status === 200) {
              toast.success("Document deleted successfully.");
            } else {
              const errMsg = res.data?.error || res.statusText || "Server error";
              toast.error(`Delete failed: ${errMsg}`);
              setDocs(previousDocs);
            }
          }
        } catch {}
      }, 10_000);
    } catch (err: any) {
      toast.dismiss(toastId);
      setDocs(previousDocs);
      toast.error(err?.response?.data?.message || err?.message || "Delete failed.");
    }
  };

  return (
    <>
      <Button variant="ghost" size="icon" className="text-red-600" onClick={() => setOpen(true)}>
        <Trash2 className="h-4 w-4" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild />

        <DialogContent className="sm:max-w-lg">
          <DialogTitle className="hidden"></DialogTitle>
          <DialogDescription className="hidden"></DialogDescription>
          <h3 className="text-lg font-semibold mb-2">Delete this document?</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            You’re about to permanently remove the&nbsp;
            <strong>{doc.bankname}</strong> statement dated&nbsp;
            <strong>{fmtDate(doc.as_of_date)}</strong>. <br />
            This action can’t be undone. Portfolio insights &amp; trend charts will be rebuilt in the background and may
            be unavailable for up to a minute.
          </p>

          <div className="flex justify-end gap-2 pt-6">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                setOpen(false);
                deleteDocument(doc);
              }}
            >
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
