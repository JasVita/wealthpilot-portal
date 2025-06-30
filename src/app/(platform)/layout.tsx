"use client";
import { ReactNode, useState } from "react";
import { AppSidebar } from "@/components/app-sidebar";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle, XCircle } from "lucide-react";
import FileUpload from "@/components/file-upload";
import { uploadFileToS3 } from "@/lib/s3Upload";
import { useWealthStore } from "@/stores/wealth-store";
import { useDocStore } from "@/stores/doc-store";
import axios from "axios";
import { BankEntry, BankTableKey, BankTables, UploadBatch } from "@/types";

export default function PlatformLayout({ children }: { children: ReactNode }) {
  const [files, setFiles] = useState<File[]>([]);
  const [status, setStatus] = useState("");
  const [open, setOpen] = useState(false);
  const { setPieDataSets, setTableDataArray, setDownloadURL, setTask2ID, clearStorage, currClient, addUploadBatch } =
    useWealthStore();
  const { saveIds } = useDocStore();

  const handleUpload = async (files: File[]) => {
    setStatus("loading");

    if (!files.length) return alert("Please upload files first.");

    try {
      clearStorage();
      const fileUrls = await Promise.all(files.map(uploadFileToS3));
      const [
        {
          data: { task1_id },
        },
        {
          data: { task1_idnew },
        },
      ] = await Promise.all([
        axios.post(`${process.env.NEXT_PUBLIC_API_URL}`, { fileUrls }),
        axios.post("https://api.wealthpilotnew.turoid.ai/bankdemo2", { fileUrls }),
      ]);

      const pollUntilOk = async (url: string, interval: number): Promise<any> => {
        const { data } = await axios.get(url);
        if (data.status === "ok") return data; // 🎉 finished
        await new Promise((res) => setTimeout(res, interval)); // ⏱ wait
        return pollUntilOk(url, interval); // 🔁 recurse
      };

      const [completed, uploadRes] = await Promise.all([
        pollUntilOk(`${process.env.NEXT_PUBLIC_API_URL}/result/${task1_id}`, 10_000),
        pollUntilOk(`https://api.wealthpilotnew.turoid.ai/bankdemo2/result/${task1_idnew}`, 20_000),
      ]);

      console.log("overview completed:", completed);
      console.log("documents completed", uploadRes);

      const piePayload = JSON.parse(completed.result.Pie_chart);
      const formattedPie = piePayload.charts.map(({ labels, data, colors }: any) => ({
        labels,
        datasets: [{ data, backgroundColor: colors }],
      }));
      setPieDataSets(formattedPie);

      const rawTable = JSON.parse(completed.result.Table);

      const uiTables = rawTable.map((bank: any, i: number) => {
        return {
          bank: bank.bank,
          as_of_date: bank.as_of_date,
          cash_and_equivalents: bank.cash_and_equivalents ?? [],
          direct_fixed_income: bank.direct_fixed_income ?? [],
          fixed_income_funds: bank.fixed_income_funds ?? [],
          direct_equities: bank.direct_equities ?? [],
          equities_fund: bank.equities_fund ?? [],
          alternative_fund: bank.alternative_fund ?? [],
          structured_products: bank.structured_products ?? [],
          loans: bank.loans ?? [],
        };
      });
      setTableDataArray(uiTables);

      rawTable.forEach((bank: any, i: number) => {
        // const uiBank = {
        //   bank: bank.bank,
        //   as_of_date: bank.as_of_date,
        //   cash_and_equivalents: bank.cash_and_equivalents ?? [],
        //   direct_fixed_income: bank.direct_fixed_income ?? [],
        //   fixed_income_funds: bank.fixed_income_funds ?? [],
        //   direct_equities: bank.direct_equities ?? [],
        //   equities_fund: bank.equities_fund ?? [],
        //   alternative_fund: bank.alternative_fund ?? [],
        //   structured_products: bank.structured_products ?? [],
        //   loans: bank.loans ?? [],
        // };

        const singleBatch: UploadBatch = {
          urls: [fileUrls[i]], // one PDF only
          // banks: [uiBank], // one bank only
          bankTags: [`${bank.bank} [${bank.as_of_date}]`],
          // excelURL: completed.result.Excel_Report_URL,
        };

        addUploadBatch(singleBatch); // 🔸 push once per file
      });
      saveIds(uploadRes.ids);

      setDownloadURL(completed.result.Excel_Report_URL);
      setTask2ID(completed.task2_id);
      setStatus("success");
    } catch (err) {
      console.error("Upload error:", err);
      setStatus("error");
      alert("Something went wrong during file processing.");
    }
  };

  const addFiles = (newFiles: FileList) => {
    setFiles((prev) => [...prev, ...Array.from(newFiles)]);
  };

  const removeFile = (name: string) => {
    setFiles((prev) => prev.filter((file) => file.name !== name));
  };

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="overflow-hidden max-h-screen">
        <header className="sticky top-0 z-50 bg-white flex h-16 items-center justify-between px-4 border-b">
          <div className="flex items-center gap-2">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 data-[orientation=vertical]:h-4" />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem className="hidden md:block">
                  <BreadcrumbLink href="/clients">Client: </BreadcrumbLink>
                </BreadcrumbItem>
                {/* <BreadcrumbSeparator className="hidden md:block" /> */}
                <BreadcrumbItem>
                  {/* <BreadcrumbPage>{currClient}</BreadcrumbPage> */}
                  {currClient}
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>

          {/* Upload Button Dialog */}
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

        <main className="h-[calc(100vh-64px)] overflow-auto">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
