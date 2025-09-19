// src/app/(platform)/layout.tsx
"use client";

import { ReactNode, useEffect, useMemo, useRef, useState } from "react";
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
  custodians: string[];
  periods: string[];
  min_date: string | null;
  max_date: string | null;
  accounts?: string[];
  custodian_map?: { bank: string; accounts: string[] }[];
  selected_custodian?: string | null;
};

export default function PlatformLayout({ children }: { children: React.ReactNode }) {
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
  const [activeCustodianSet, setActiveCustodianSet] = useState<Set<string>>(new Set());
  const { selected: selectedCustodian, setSelected: setSelectedCustodian } = useCustodianStore();

  // periods + dates + account (GLOBAL store)
  const {
    periods,
    fromDate,
    toDate,
    setPeriods,
    setFromDate,
    setToDate,
    account,          // ⬅️ selected account (global)
    setAccount,       // ⬅️ setter
    reset,
  } = useClientFiltersStore();

  // Map + hint from /filters
  const [custodianMap, setCustodianMap] = useState<{ bank: string; accounts: string[] }[]>([]);
  const [selectedCustodianFromFilter, setSelectedCustodianFromFilter] = useState<string | null>(null);

  // List of accounts for the current selection (remains local list for the dropdown)
  const [accounts, setAccounts] = useState<string[]>([]);

  // race guard for /filters fetches
  const loadIdRef = useRef(0);

  // Active first, inactive later (both A→Z)
  const { activeList, inactiveList } = useMemo(() => {
    const act: string[] = [];
    const inact: string[] = [];
    for (const c of custodians) {
      (activeCustodianSet.has(c) ? act : inact).push(c);
    }
    act.sort((a, b) => a.localeCompare(b));
    inact.sort((a, b) => a.localeCompare(b));
    return { activeList: act, inactiveList: inact };
  }, [custodians, activeCustodianSet]);

  // ---- UI helper: in "All + no dates", treat everyone active & hide the inactive bucket
  const showInactiveGroup = useMemo(
    () => selectedCustodian !== "ALL" || !!fromDate || !!toDate,
    [selectedCustodian, fromDate, toDate]
  );

  const { renderActive, renderInactive } = useMemo(() => {
    if (selectedCustodian === "ALL" && !fromDate && !toDate) {
      return { renderActive: custodians, renderInactive: [] as string[] };
    }
    return { renderActive: activeList, renderInactive: inactiveList };
  }, [selectedCustodian, fromDate, toDate, custodians, activeList, inactiveList]);

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

  // Load header data without racing: filters (periods + accounts) for the current selection
  useEffect(() => {
    if (!currClient) return;

    let aborted = false;
    const myId = ++loadIdRef.current;

    (async () => {
      const params = new URLSearchParams({ client_id: String(currClient) });
      if (selectedCustodian && selectedCustodian !== "ALL") params.set("custodian", selectedCustodian);
      if (account && account !== "ALL") params.set("account", account);

      try {
        const res = await fetch(`/api/clients/filters?${params.toString()}`, { cache: "no-store" });
        const filters: ClientFiltersResponse = await res.json();
        if (aborted || loadIdRef.current !== myId) return; // ignore stale responses

        // custodians for menu
        const union = Array.from(new Set((filters?.custodians ?? []).map((s) => s?.trim()).filter(Boolean))).sort();
        setCustodians(union);

        // periods for this (custodian/account) selection
        const periodArr = (Array.isArray(filters?.periods) ? filters.periods : []).map((s) => s.slice(0, 10));
        setPeriods(periodArr);

        // custodian map + hint
        setCustodianMap(Array.isArray(filters?.custodian_map) ? filters.custodian_map : []);
        setSelectedCustodianFromFilter(
          typeof filters?.selected_custodian === "string" ? filters.selected_custodian : null
        );

        // accounts list for selection (all accounts if custodian = ALL and no account)
        const acctArr: string[] = Array.isArray(filters?.accounts)
          ? (filters.accounts as string[]).map((s) => s?.trim()).filter(Boolean)
          : [];
        setAccounts(acctArr);

        // Snap dates:
        // * ALL → clear both (show everything).
        // * Else → "up to" semantics: To = max_date, From = null.
        if (selectedCustodian === "ALL" && (!account || account === "ALL")) {
          setFromDate(null);
          setToDate(null);
        } else {
          const defTo =
            (typeof filters?.max_date === "string" && filters.max_date) || periodArr[0] || null;
          setFromDate(null); // "up to" semantics
          setToDate(defTo);
        }

        // Auto-switch custodian if account chosen and server tells us the bank
        if (account && account !== "ALL" && filters?.selected_custodian) {
          const bank = filters.selected_custodian;
          if (bank && bank !== selectedCustodian) {
            setSelectedCustodian(bank);
          }
        }

        // guard invalid selection
        if (!union.includes(selectedCustodian) && selectedCustodian !== "ALL") {
          setSelectedCustodian("ALL");
        }
      } catch {
        if (!aborted) {
          setCustodians([]);
          setAccounts([]);
          setAccount("ALL");
          setActiveCustodianSet(new Set());
          setSelectedCustodian("ALL");
          reset();
        }
      }
    })();

    return () => {
      aborted = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currClient, selectedCustodian, account]);

  // Active custodians reflect the effective window used by Overview
  useEffect(() => {
    let aborted = false;

    (async () => {
      if (!currClient) return;

      // Special case: Custodian = ALL AND no dates chosen → treat all as active
      if (selectedCustodian === "ALL" && !fromDate && !toDate) {
        setActiveCustodianSet(new Set(custodians));
        return;
      }

      // Otherwise, compute from overview for the current range
      const sorted = [...periods].filter(Boolean).sort(); // asc
      const effFrom = fromDate ?? sorted[0] ?? null;
      const effTo = toDate ?? sorted[sorted.length - 1] ?? null;

      try {
        const params: any = { client_id: currClient };
        if (effFrom && effTo) {
          params.from = effFrom;
          params.to = effTo;
        } else if (effTo) {
          params.to = effTo; // to-only; server shows data “up to”
        }
        if (selectedCustodian && selectedCustodian !== "ALL") params.custodian = selectedCustodian;
        if (account && account !== "ALL") params.account = account;

        const { data } = await axios.get("/api/clients/assets/overview", { params });
        if (aborted) return;

        const table = data?.overview_data?.[0]?.table_data?.tableData ?? [];
        const banks = new Set<string>();
        for (const b of table) {
          const name = typeof b?.bank === "string" ? b.bank.trim() : "";
          if (name) banks.add(name);
        }
        setActiveCustodianSet(banks);
      } catch {
        if (!aborted) setActiveCustodianSet(new Set());
      }
    })();

    return () => {
      aborted = true;
    };
  }, [currClient, fromDate, toDate, periods, custodians, selectedCustodian, account]);

  // To acts as "up to" (clear from on change)
  const handleToChange = (d: string) => {
    setToDate(d);
    setFromDate(null);
  };

  // Account selection (GLOBAL)
  const handleAccountChange = (acc: string) => {
    setAccount(acc || "ALL");
    // The filters effect will fetch with ?account=... and auto-switch custodian via selected_custodian
  };

  function handleCustodianChange(next: string) {
    setSelectedCustodian(next);
    setAccount("ALL");
    // Always clear the old range; the filters effect will set the proper To later
    setFromDate(null);
    setToDate(null);
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
          {/* LEFT: client / custodian / account / to */}
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

                      {/* Active (A→Z) */}
                      {renderActive.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}

                      {/* Inactive (A→Z) */}
                      {showInactiveGroup && renderInactive.length > 0 && (
                        <>
                          <SelectLabel className="text-muted-foreground">No data for range</SelectLabel>
                          {renderInactive.map((c) => (
                            <SelectItem key={c} value={c}>
                              {c}
                            </SelectItem>
                          ))}
                        </>
                      )}
                    </SelectGroup>
                  </SelectContent>
                </Select>

                {/* Account (GLOBAL) */}
                <Separator orientation="vertical" className="mx-2 h-4" />
                <span className="text-sm text-muted-foreground">Account:</span>
                <Select value={account} onValueChange={handleAccountChange}>
                  <SelectTrigger className="w-[220px]">
                    <SelectValue placeholder="All accounts" />
                  </SelectTrigger>
                  <SelectContent className="z-[60]">
                    <SelectGroup>
                      <SelectLabel>Accounts</SelectLabel>
                      <SelectItem value="ALL">All</SelectItem>
                      {accounts.map((a) => (
                        <SelectItem key={a} value={a}>
                          {a}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>

                {/* From (commented out per request)
                <Separator orientation="vertical" className="mx-2 h-4" />
                <span className="text-sm text-muted-foreground">From:</span>
                <Select value={fromDate ?? undefined} onValueChange={(d) => setFromDate(d)}>
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
                */}

                {/* Up To Date */}
                <Separator orientation="vertical" className="mx-2 h-4" />
                <span className="text-sm text-muted-foreground">Date:</span>
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
