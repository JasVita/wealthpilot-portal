// src/app/(platform)/layout.tsx
"use client";

import { ReactNode, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import axios from "axios";
import { toast } from "sonner";

import { AppSidebar } from "@/components/app-sidebar";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Loader2, CheckCircle, XCircle } from "lucide-react";

import FileUpload from "@/components/file-upload";
import { useClientStore } from "@/stores/clients-store";
import { useUserStore } from "@/stores/user-store";
import { useWealthStore } from "@/stores/wealth-store";
import { useCustodianStore } from "@/stores/custodian-store";
import { uploadFileToS3 } from "@/lib/s3Upload";

export default function PlatformLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const isTrades = pathname?.startsWith("/trades/");

  // ───────────────────────── stores / state
  const { clients, order, currClient, setCurrClient, loadClients } = useClientStore();
  const { id: user_id } = useUserStore();
  const { clearStorage } = useWealthStore();

  // Upload state
  const [files, setFiles] = useState<File[]>([]);
  const [status, setStatus] = useState<"" | "loading" | "success" | "warning" | "error">("");
  const [open, setOpen] = useState(false);
  const [progress, setProgress] = useState({
    done: 0,
    total: 0,
    state: "PENDING" as
      | "PENDING"
      | "PROGRESS"
      | "SUCCESS"
      | "PARTIAL_SUCCESS"
      | "FAILURE"
      | "REVOKED",
    failed: [] as any[],
  });

  // Custodian global selection
  const [custodians, setCustodians] = useState<string[]>([]);
  const { selected: selectedCustodian, setSelected: setSelectedCustodian } = useCustodianStore();

  // Period (month) — display only
  const months = useMemo(() => {
    const out: { value: string; label: string }[] = [];
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
      const value = d.toISOString().slice(0, 7); // YYYY-MM
      const label = d.toLocaleDateString("en-US", { year: "numeric", month: "short" }); // Sep 2025
      out.push({ value, label });
    }
    return out;
  }, []);
  const [period, setPeriod] = useState<string>(() => {
    const d = new Date();
    return d.toISOString().slice(0, 7);
  });

  // ───────────────────────── client switch
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

  // ───────────────────────── custodians for current client
  useEffect(() => {
    let abort = false;
    async function loadCustodians() {
      setCustodians([]);
      if (!currClient) return;
      try {
        // reuse custodian API (it returns by_bank.labels in your latest route)
        const { data } = await axios.get("/api/clients/assets/custodian", {
          params: { client_id: currClient },
        });

        const list: string[] = Array.isArray(data?.cash?.by_bank?.labels)
          ? data.cash.by_bank.labels
          : Array.isArray(data?.custodians)
          ? data.custodians
          : [];

        if (!abort) {
          const uniq = Array.from(new Set(list.filter(Boolean))).sort();
          setCustodians(uniq);
          if (!uniq.includes(selectedCustodian) && selectedCustodian !== "ALL") {
            setSelectedCustodian("ALL");
          }
        }
      } catch {
        if (!abort) {
          setCustodians([]);
          setSelectedCustodian("ALL");
        }
      }
    }
    loadCustodians();
    return () => {
      abort = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currClient]);

  function handleCustodianChange(next: string) {
    setSelectedCustodian(next);
    // If you later want this reflected in the URL:
    // const sp = new URLSearchParams(window.location.search);
    // if (next === "ALL") sp.delete("custodian"); else sp.set("custodian", next);
    // router.replace(`${pathname}?${sp.toString()}`);
  }

  // ───────────────────────── upload logic (restored)
  const isFinished = (state: string) =>
    state === "SUCCESS" || state === "PARTIAL_SUCCESS" || state === "FAILURE" || state === "REVOKED";

  const startPolling = (taskId: string, fileCount: number) => {
    const pollId = setInterval(async () => {
      try {
        const base = process.env.NEXT_PUBLIC_API_URL;
        const { data } = await axios.get(`${base}/upload/${taskId}`);

        setProgress({
          done: data.done ?? 0,
          total: fileCount,
          state: data.state,
          failed: data.failed ?? [],
        });

        if (isFinished(data.state)) {
          clearInterval(pollId);
          if (data.state === "SUCCESS") {
            toast.success("Analysis completed! All files processed.");
            setStatus("success");
          } else if (data.state === "PARTIAL_SUCCESS") {
            toast.warning(
              `Finished with some errors – ${data.failed?.length ?? 0} of ${fileCount} file(s) failed.`
            );
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
    }, 60_000); // 60s like your previous version
  };

  const handleUpload = async (theFiles: File[]) => {
    if (!theFiles.length) return alert("Please upload files first.");
    if (!currClient) return alert("Please select a client first.");

    setStatus("loading");
    try {
      clearStorage();

      // Upload to S3; your helper returns a public URL per file
      const fileUrls = await Promise.all(theFiles.map(uploadFileToS3));

      const base = process.env.NEXT_PUBLIC_API_URL;
      const { data } = await axios.post(`${base}/upload`, {
        fileUrls,
        client_id: currClient,
        user_id,
      });

      const taskId = data?.task1_idnew || data?.task_id || data?.task1_id || "";
      if (!taskId) {
        throw new Error("No task id returned from upload API.");
      }

      toast.info("Files uploaded. Analyzing...");
      setProgress({ done: 0, total: fileUrls.length, state: "PENDING", failed: [] });
      startPolling(taskId, fileUrls.length);
    } catch (err: any) {
      console.error("Upload error:", err);
      toast.error(err?.message || "Upload failed, please try again later or contact support.");
      setStatus("error");
    } finally {
      // refresh client list after analysis kicks off
      loadClients();
    }
  };

  const addFiles = (newFiles: FileList) => {
    setFiles((prev) => [...prev, ...Array.from(newFiles)]);
  };
  const removeFile = (name: string) => {
    setFiles((prev) => prev.filter((f) => f.name !== name));
  };

  // ───────────────────────── UI
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="overflow-hidden max-h-screen">
        <header className="sticky top-0 z-50 bg-white flex h-16 items-center justify-between px-4 border-b">
          {/* LEFT: client / custodian / period */}
          <div className="flex items-center gap-2">
            <SidebarTrigger className="-ml-1" />
            <Separator
              orientation="vertical"
              className="mr-2 data-[orientation=vertical]:h-9 md:data-[orientation=vertical]:h-4 mt-1 md:mt-0"
            />

            {isTrades ? (
              /* page-level toolbar can portal here if needed */
              <div id="header-left-slot" className="flex items-center gap-2" />
            ) : (
              <>
                <span className="text-sm text-muted-foreground">Current client:</span>
                <Select value={currClient ?? undefined} onValueChange={handleClientChange}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Select a client" />
                  </SelectTrigger>
                  <SelectContent className="z-[60]">
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

                {/* Custodian */}
                <Separator orientation="vertical" className="mx-2 h-4" />
                <span className="text-sm text-muted-foreground">Custodian:</span>
                <Select value={selectedCustodian} onValueChange={setSelectedCustodian}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="All custodians" />
                  </SelectTrigger>
                  <SelectContent className="z-[60]">
                    <SelectGroup>
                      <SelectLabel>Custodians</SelectLabel>
                      <SelectItem value="ALL">All</SelectItem>
                      {custodians.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>

                {/* Period (month) — display only */}
                <Separator orientation="vertical" className="mx-2 h-4" />
                <span className="text-sm text-muted-foreground">Period:</span>
                <Select value={period} onValueChange={setPeriod}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Select month" />
                  </SelectTrigger>
                  <SelectContent className="z-[60]">
                    <SelectGroup>
                      <SelectLabel>Reporting Month</SelectLabel>
                      {months.map((m) => (
                        <SelectItem key={m.value} value={m.value}>
                          {m.label}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </>
            )}
          </div>

          {/* MIDDLE: progress bar (hidden on /trades) */}
          {!isTrades && status === "loading" && (
            <div className="w-full mx-4">
              <Progress value={progress.total ? (progress.done / progress.total) * 100 : 0} />
              <span className="text-xs text-muted-foreground">
                {progress.done}/{progress.total}
              </span>
            </div>
          )}

          {/* RIGHT: Upload dialog (hidden on /trades) */}
          {!isTrades && (
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
                  addFiles={(fl: FileList) =>
                    setFiles((prev: File[]) => [...prev, ...Array.from(fl)])
                  }
                  removeFile={(name: string) =>
                    setFiles((prev: File[]) => prev.filter((f) => f.name !== name))
                  }
                  upload={async () => {
                    setOpen(false);
                    await handleUpload(files);
                    setFiles([]);
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
