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
import { useClientFiltersStore } from "@/stores/client-filters-store";
import { uploadFileToS3 } from "@/lib/s3Upload";

/** Typed shape for /api/clients/filters response */
type ClientFiltersResponse = {
  custodians: unknown[];
  periods: unknown[];
  min_date: string | null;
  max_date: string | null;
};

export default function PlatformLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const isTrades = pathname?.startsWith("/trades/");

  // stores
  const { clients, order, currClient, setCurrClient, loadClients } = useClientStore();
  const { id: user_id } = useUserStore();
  const { clearStorage } = useWealthStore();

  // upload state
  const [files, setFiles] = useState<File[]>([]);
  const [status, setStatus] = useState<"" | "loading" | "success" | "warning" | "error">("");
  const [open, setOpen] = useState(false);
  const [progress, setProgress] = useState({
    done: 0,
    total: 0,
    state: "PENDING" as "PENDING" | "PROGRESS" | "SUCCESS" | "PARTIAL_SUCCESS" | "FAILURE" | "REVOKED",
    failed: [] as any[],
  });

  // custodian + periods (global)
  const [custodians, setCustodians] = useState<string[]>([]);
  const { selected: selectedCustodian, setSelected: setSelectedCustodian } = useCustodianStore();
  const { periods, fromDate, toDate, setPeriods, setFromDate, setToDate, reset } = useClientFiltersStore();

  // client switch
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

  // custodians for current client
  useEffect(() => {
    let abort = false;
    async function loadCustodians() {
      setCustodians([]);
      if (!currClient) return;
      try {
        const { data } = await axios.get("/api/clients/assets/custodian", {
          params: { client_id: currClient },
        });

        // Ensure not-any: treat incoming arrays as unknown[] then narrow to string[]
        const raw: unknown[] = Array.isArray((data as any)?.cash?.by_bank?.labels)
          ? ((data as any).cash.by_bank.labels as unknown[])
          : Array.isArray((data as any)?.custodians)
          ? ((data as any).custodians as unknown[])
          : [];

        const list: string[] = raw
          .filter((x): x is string => typeof x === "string")
          .map((s) => s.trim())
          .filter(Boolean);

        if (!abort) {
          const uniq = Array.from(new Set<string>(list)).sort();
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

  // load available periods for this client (+ custodian filter)
  useEffect(() => {
    let alive = true;
    async function run() {
      reset();
      if (!currClient) return;

      const params = new URLSearchParams({ client_id: String(currClient) });
      if (selectedCustodian && selectedCustodian !== "ALL") {
        params.set("custodian", selectedCustodian);
      }

      const res = await fetch(`/api/clients/filters?${params.toString()}`, { cache: "no-store" });
      const data: ClientFiltersResponse = await res.json();
      if (!alive) return;

      if (Array.isArray(data?.custodians) && !custodians.length) {
        const uniq = Array.from(
          new Set<string>(
            (data.custodians as unknown[])
              .filter((x): x is string => typeof x === "string")
              .map((s) => s.trim())
              .filter(Boolean)
          )
        ).sort();
        setCustodians(uniq);
      }

      const periodArr: string[] = (Array.isArray(data?.periods) ? (data.periods as unknown[]) : [])
        .filter((x): x is string => typeof x === "string")
        .map((s) => s.slice(0, 10));
      setPeriods(periodArr);

      const defFrom: string | null =
        (typeof data?.min_date === "string" && data.min_date) ||
        periodArr[periodArr.length - 1] ||
        null;
      const defTo: string | null =
        (typeof data?.max_date === "string" && data.max_date) || periodArr[0] || defFrom;

      setFromDate(defFrom);
      setToDate(defTo);
    }
    run();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currClient, selectedCustodian]);

  // From/To guards
  const handleFromChange = (d: string) => {
    setFromDate(d);
    if (toDate && d > toDate) setToDate(d);
  };
  const handleToChange = (d: string) => {
    setToDate(d);
    if (fromDate && d < fromDate) setFromDate(d);
  };

  function handleCustodianChange(next: string) {
    setSelectedCustodian(next);
  }

  // upload logic
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
            toast.warning(`${data.failed?.length ?? 0} of ${fileCount} file(s) failed.`);
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

  const handleUpload = async (theFiles: File[]) => {
    if (!theFiles.length) return alert("Please upload files first.");
    if (!currClient) return alert("Please select a client first.");

    setStatus("loading");
    try {
      clearStorage();

      const fileUrls = await Promise.all(theFiles.map(uploadFileToS3));

      const base = process.env.NEXT_PUBLIC_API_URL;
      const { data } = await axios.post(`${base}/upload`, {
        fileUrls,
        client_id: currClient,
        user_id,
      });

      const taskId = data?.task1_idnew || data?.task_id || data?.task1_id || "";
      if (!taskId) throw new Error("No task id returned from upload API.");

      toast.info("Files uploaded. Analyzing...");
      setProgress({ done: 0, total: fileUrls.length, state: "PENDING", failed: [] });
      startPolling(taskId, fileUrls.length);
    } catch (err: any) {
      console.error("Upload error:", err);
      toast.error(err?.message || "Upload failed, please try again later or contact support.");
      setStatus("error");
    } finally {
      loadClients();
    }
  };

  const addFiles = (newFiles: FileList) => {
    setFiles((prev) => [...prev, ...Array.from<File>(newFiles)]);
  };
  const removeFile = (name: string) => {
    setFiles((prev) => prev.filter((f) => f.name !== name));
  };

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
                <Select value={selectedCustodian} onValueChange={handleCustodianChange}>
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

                {/* From / To */}
                <Separator orientation="vertical" className="mx-2 h-4" />
                <span className="text-sm text-muted-foreground">From:</span>
                <Select value={fromDate ?? undefined} onValueChange={handleFromChange}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Select date" />
                  </SelectTrigger>
                  <SelectContent className="z-[60]">
                    <SelectGroup>
                      <SelectLabel>From Date</SelectLabel>
                      {periods.map((d) => (
                        <SelectItem key={d} value={d}>
                          {d}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>

                <span className="text-sm text-muted-foreground ml-2">To:</span>
                <Select value={toDate ?? undefined} onValueChange={handleToChange}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Select date" />
                  </SelectTrigger>
                  <SelectContent className="z-[60]">
                    <SelectGroup>
                      <SelectLabel>To Date</SelectLabel>
                      {periods.map((d) => (
                        <SelectItem key={d} value={d}>
                          {d}
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
                  addFiles={(fl: FileList) => setFiles((prev) => [...prev, ...Array.from<File>(fl)])}
                  removeFile={(name: string) => setFiles((prev) => prev.filter((f) => f.name !== name))}
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
