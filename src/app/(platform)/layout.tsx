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
import {
  Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { useClientStore } from "@/stores/clients-store";
import { useUserStore } from "@/stores/user-store";
import { useWealthStore } from "@/stores/wealth-store";
import axios from "axios";
import { toast } from "sonner";
import { uploadFileToS3 } from "@/lib/s3Upload";

export default function PlatformLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const isTrades = pathname?.startsWith("/trades/");   // <── detect trades pages

  const [files, setFiles] = useState<File[]>([]);
  const [status, setStatus] = useState("");
  const [open, setOpen] = useState(false);

  const { clearStorage } = useWealthStore();
  const { clients, order, currClient, setCurrClient, loadClients } = useClientStore();
  const { id: user_id } = useUserStore();

  const [progress, setProgress] = useState({
    done: 0, total: 0,
    state: "PENDING" as "PENDING" | "PROGRESS" | "SUCCESS" | "PARTIAL_SUCCESS" | "FAILURE" | "REVOKED",
    failed: [] as any[],
  });

  function handleClientChange(nextId: string) {
    setCurrClient(nextId);

    if (pathname?.startsWith("/clients/")) {
      const parts = pathname.split("/");
      parts[2] = nextId;
      router.push(parts.join("/"));
      return;
    }
    if (pathname?.startsWith("/trades/")) {
      const parts = pathname.split("/"); // ["", "trades", "<id>", ...]
      parts[2] = nextId;
      router.push(parts.join("/"));
      return;
    }
    router.push(`/clients/${nextId}/assets/holdings`);
  }

  // ... upload code unchanged ...

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="overflow-hidden max-h-screen">
        <header className="sticky top-0 z-50 bg-white flex h-16 items-center justify-between px-4 border-b">

          {/* LEFT SIDE: trigger + bar + slot */}
          <div className="flex items-center gap-2">
            <SidebarTrigger className="-ml-1" />
            {/* <Separator orientation="vertical" className="mr-2 data-[orientation=vertical]:h-4" /> */}
            <Separator
              orientation="vertical"
              className="
                mr-2
                data-[orientation=vertical]:h-9   /* taller on small screens */
                md:data-[orientation=vertical]:h-4
                mt-1                               /* drop it a bit */
                md:mt-0
              "
            />

            {/* ─────────────────────────────────────────────────────────
             *  If we are on /trades, render a placeholder slot.
             *  The page will portal its Date/Bank/Account controls here.
             *  Otherwise render the existing Current client select.
             * ───────────────────────────────────────────────────────── */}
            {isTrades ? (
              <div id="header-left-slot" className="flex items-center gap-2" />
            ) : (
              <>
                <span className="text-sm text-muted-foreground">Current client:</span>
                <Select value={currClient ?? undefined} onValueChange={handleClientChange}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Select a client" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectLabel>Clients</SelectLabel>
                      {order.map((id) => (
                        <SelectItem key={id} value={id}>{clients[id]?.name ?? id}</SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </>
            )}
          </div>

          {/* RIGHT SIDE: upload progress / button — hidden on trades */}
          {!isTrades && status === "loading" && (
            <div className="w-full mx-4">
              <Progress value={progress.total ? (progress.done / progress.total) * 100 : 0} />
              <span className="text-xs text-muted-foreground">
                {progress.done}/{progress.total}
              </span>
            </div>
          )}

          {/* Upload controls — also hidden on /trades */}
          {!isTrades && (
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button className="font-semibold px-4 py-2">
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
                  // 1) Type ‘fl’ so Array.from() produces File[]
                  addFiles={(fl: FileList) =>
                    setFiles((prev: File[]) => [...prev, ...Array.from(fl)])
                  }
                  // 2) Type ‘name’, and prev is File[]
                  removeFile={(name: string) =>
                    setFiles((prev: File[]) => prev.filter((f: File) => f.name !== name))
                  }
                  upload={async () => {
                    setOpen(false);
                    // call your upload logic here…
                  }}
                  status="ok"
                />
              </DialogContent>
            </Dialog>
          )}
        </header>

        <main className="h-[calc(100vh-64px)] overflow-auto">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
