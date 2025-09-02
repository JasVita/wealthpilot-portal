// src/app/(platform)/layout.tsx
"use client";

import { ReactNode, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AppSidebar } from "@/components/app-sidebar";
import { Separator } from "@/components/ui/separator";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle, XCircle } from "lucide-react";
import FileUpload from "@/components/file-upload";
import { useWealthStore } from "@/stores/wealth-store";
import axios from "axios";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { useClientStore } from "@/stores/clients-store";
import { useUserStore } from "@/stores/user-store";
import { toast } from "sonner";
import { uploadFileToS3 } from "@/lib/s3Upload";

export default function PlatformLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  const [files, setFiles] = useState<File[]>([]);
  const [status, setStatus] = useState("");
  const [open, setOpen] = useState(false);
  const { clearStorage } = useWealthStore();
  const { clients, order, currClient, setCurrClient, loadClients } = useClientStore();
  const { id: user_id } = useUserStore();

  const [progress, setProgress] = useState<{
    done: number;
    total: number;
    state: "PENDING" | "PROGRESS" | "SUCCESS" | "PARTIAL_SUCCESS" | "FAILURE" | "REVOKED";
    failed: any[];
  }>({ done: 0, total: 0, state: "PENDING", failed: [] });

  /* ──────────────────────────────────────────────────────────────
   * Route change when user picks a different client
   *  - If already under /clients/[id]/..., replace the [id] segment
   *  - Else navigate to /clients/<id>/assets/holdings
   *  - Always keep store in sync
   * ────────────────────────────────────────────────────────────── */
  function handleClientChange(nextId: string) {
    setCurrClient(nextId);

    if (pathname?.startsWith("/clients/")) {
      const parts = pathname.split("/"); // ["", "clients", "<id>", ...]
      if (parts.length >= 3) {
        parts[2] = nextId; // swap the [clientId] segment
        router.push(parts.join("/"));
        return;
      }
    }

    router.push(`/clients/${nextId}/assets/holdings`);
  }

  /* ──────────────────────────────────────────────────────────────
   * Upload pipeline (unchanged)
   * ────────────────────────────────────────────────────────────── */
  const isFinished = (state: string) =>
    state === "SUCCESS" || state === "PARTIAL_SUCCESS" || state === "FAILURE" || state === "REVOKED";

  const startPolling = (taskId: string, numFlies: number) => {
    const pollId = setInterval(async () => {
      try {
        const { data } = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/upload/${taskId}`);

        setProgress({
          done: data.done ?? 0,
          total: numFlies,
          state: data.state,
          failed: data.failed ?? [],
        });

        if (isFinished(data.state)) {
          clearInterval(pollId);

          if (data.state === "SUCCESS") {
            toast.success("Analysis completed! All files processed.");
            setStatus("success");
          } else if (data.state === "PARTIAL_SUCCESS") {
            toast.warning(`Finished with some errors – ${data.failed.length} of ${data.total} file(s) failed.`);
            setStatus("warning");
          } else {
            toast.error("Upload failed – please try again.");
            setStatus("error");
          }
        }
      } catch {
        clearInterval(pollId);
        toast.error("Network error while checking progress.");
        setStatus("error");
      }
    }, 60_000);
  };

  const handleUpload = async (files: File[]) => {
    if (!files.length) return alert("Please upload files first.");
    if (!currClient) return alert("Please select a client first.");
    setStatus("loading");

    try {
      clearStorage();
      const fileUrls = await Promise.all(files.map(uploadFileToS3));

      const { data: { task1_idnew } } = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/upload`, {
        fileUrls,
        client_id: currClient,
        user_id,
      });

      toast.info("Files uploaded. Analyzing...");
      setProgress({ done: 0, total: fileUrls.length, state: "PENDING", failed: [] });
      startPolling(task1_idnew, fileUrls.length);
    } catch (err: any) {
      console.error("Upload error:", err);
      toast.error(err.message || "Upload failed, please try again later or contact us");
      setStatus("error");
      alert("Something went wrong during file processing.");
    } finally {
      loadClients();
    }
  };

  const addFiles = (newFiles: FileList) => setFiles((prev) => [...prev, ...Array.from(newFiles)]);
  const removeFile = (name: string) => setFiles((prev) => prev.filter((file) => file.name !== name));

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="overflow-hidden max-h-screen">
        <header className="sticky top-0 z-50 bg-white flex h-16 items-center justify-between px-4 border-b">
          <div className="flex items-center gap-2">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 data-[orientation=vertical]:h-4" />
            <span className="text-sm text-muted-foreground">Current client:</span>

            {/* Controlled select: whatever is in the store drives the UI */}
            <Select value={currClient ?? undefined} onValueChange={handleClientChange}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Select a client" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>Clients</SelectLabel>
                  {order.map((id) => (
                    <SelectItem key={id} value={id}>
                      {clients[id]?.name ?? id}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>

          {status === "loading" && (
            <div className="w-full mx-4">
              <Progress value={progress.total ? (progress.done / progress.total) * 100 : 0} />
              <span className="text-xs text-muted-foreground">
                {progress.done}/{progress.total}
              </span>
            </div>
          )}

          {/* Upload dialog (unchanged) */}
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button
                className="font-semibold px-4 py-2"
                onClick={(e) => {
                  if (status === "loading") {
                    e.preventDefault();
                    e.stopPropagation();
                  }
                }}
              >
                {status === "loading" && <Loader2 className="mr-2 animate-spin" size={16} />}
                {status === "success" && <CheckCircle className="mr-2" size={16} />}
                {status === "error" && <XCircle className="mr-2" size={16} />}
                {status === "loading" ? "Analyzing..." : "Upload Files"}
              </Button>
            </DialogTrigger>
            <DialogContent className="flex flex-col items-center p-6">
              <DialogTitle className="text-lg font-semibold">Upload Financial Documents</DialogTitle>
              <DialogDescription className="mb-4 text-sm text-muted-foreground text-center">
                Upload your bank or investment reports. We&apos;ll automatically analyze them.
              </DialogDescription>
              <FileUpload
                files={files}
                addFiles={addFiles}
                removeFile={removeFile}
                upload={async () => {
                  setOpen(false);
                  await handleUpload(files);
                  setFiles([]);
                }}
                status="ok"
              />
            </DialogContent>
          </Dialog>
        </header>

        {/* Main content (scrollable; uses the light scrollbars you added) */}
        <main className="h-[calc(100vh-64px)] overflow-auto">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
