"use client";

import { useEffect, useMemo, useState } from "react";
import { useClientStore } from "@/stores/clients-store";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
} from "@/components/ui/alert-dialog";
import { MOCK_UI, USE_MOCKS } from "@/lib/dev-logger";

type Tone = "default" | "success" | "warning";

type RiskRecord = {
  status: "Effective" | "Expired";
  tags?: string[];
  rating: number;
  label: string;
  objective: string;
  expected_return: string;
  expected_volatility: string;
  declines: string;
  time_horizon: string;
  liquidity: string;
  justification: string;
  effective_date: string;   // YYYY-MM-DD
  expiration_date: string;  // YYYY-MM-DD
};

type ComplianceMock = {
  kyc_status?: string;
  aml_status?: string;
  risk_status?: string;
  records?: RiskRecord[];
};

const toneCls: Record<Tone, string> = {
  success: "bg-emerald-100 text-emerald-700",
  warning: "bg-amber-100 text-amber-700",
  default: "bg-slate-100 text-slate-700",
};

const smallDot: Record<Tone, string> = {
  success: "bg-emerald-500",
  warning: "bg-amber-500",
  default: "bg-slate-400",
};

function StatusRow({
  title,
  value,
  tone = "default",
}: {
  title: string;
  value: string;
  tone?: Tone;
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border p-3">
      <div className="font-medium">{title}</div>
      <div className="flex items-center gap-2">
        <span className={`h-2 w-2 rounded-full ${smallDot[tone]}`} />
        <Badge className={toneCls[tone]}>{value}</Badge>
      </div>
    </div>
  );
}

const fmt = (s: string) =>
  new Date(s).toLocaleDateString("en-CA", { year: "numeric", month: "2-digit", day: "2-digit" });

export default function CompliancePage({ params }: { params: { clientId: string } }) {
  const { setCurrClient } = useClientStore();
  useEffect(() => {
    if (params.clientId) setCurrClient(params.clientId);
  }, [params.clientId, setCurrClient]);

  // --- Load optional mock ---
  const [mock, setMock] = useState<ComplianceMock | null>(null);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/mocks/compliance.${params.clientId}.json`, { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as ComplianceMock;
        if (!cancelled) setMock(data);
      } catch { }
    })();
    return () => { cancelled = true; };
  }, [params.clientId]);

  const seed = useMemo(() => {
    const defaults: ComplianceMock = {
      kyc_status: "Compliant",
      aml_status: "Under Review",
      risk_status: "Approved",
      records: [
        {
          status: "Effective",
          tags: ["Linked Client 0001"],
          rating: 1,
          label: "Asset Preservation",
          objective:
            "My objective is slight asset appreciation with capital preservation being the primary goal.",
          expected_return: "1–3%",
          expected_volatility: "1–4%",
          declines: "Up to 10%",
          time_horizon: "1–2 years",
          liquidity: "No more than 50% in illiquid investments",
          justification:
            "Based on client profile assessment and conservative investment approach suitable for preservation of capital.",
          effective_date: "2025-04-08",
          expiration_date: "2026-04-08",
        },
        {
          status: "Expired",
          tags: ["Client not confirmed", "Linked Client 0001"],
          rating: 2,
          label: "Conservative Growth",
          objective:
            "Balanced approach with moderate growth potential while maintaining stability.",
          expected_return: "3–5%",
          expected_volatility: "5–8%",
          declines: "Up to 15%",
          time_horizon: "2–3 years",
          liquidity: "Moderate liquidity requirements",
          justification:
            "Previous assessment based on initial client requirements before profile update.",
          effective_date: "2024-04-08",
          expiration_date: "2025-04-08",
        },
      ],
    };
    return {
      kycStatus: mock?.kyc_status ?? defaults.kyc_status!,
      amlStatus: mock?.aml_status ?? defaults.aml_status!,
      riskStatus: mock?.risk_status ?? defaults.risk_status!,
      records: (mock?.records?.length ? mock.records : defaults.records) as RiskRecord[],
    };
  }, [mock]);

  // Local, editable copy of the records
  const [items, setItems] = useState<RiskRecord[]>(seed.records);
  useEffect(() => setItems(seed.records), [seed.records]);

  // --- Edit dialog state ---
  const [editOpen, setEditOpen] = useState(false);
  const [editIdx, setEditIdx] = useState<number | null>(null);
  const [form, setForm] = useState<RiskRecord | null>(null);

  const openEdit = (idx: number) => {
    setEditIdx(idx);
    setForm({ ...items[idx] });
    setEditOpen(true);
  };
  const handleForm = <K extends keyof RiskRecord>(k: K, v: RiskRecord[K]) =>
    setForm((f) => (f ? { ...f, [k]: v } : f));
  const saveEdit = () => {
    if (editIdx == null || !form) return;
    setItems((prev) => prev.map((r, i) => (i === editIdx ? { ...form } : r)));
    setEditOpen(false);
    // TODO: call your API here to persist if needed
  };

  // --- Delete confirmation ---
  const [delOpen, setDelOpen] = useState(false);
  const [delIdx, setDelIdx] = useState<number | null>(null);
  const confirmDelete = (idx: number) => {
    setDelIdx(idx);
    setDelOpen(true);
  };
  const doDelete = () => {
    if (delIdx == null) return;
    setItems((prev) => prev.filter((_, i) => i !== delIdx));
    setDelOpen(false);
    // TODO: call your API here to persist if needed
  };

  return (
    <div className="p-4 space-y-6">
      {/* Top status chips */}
      <div className={`grid grid-cols-1 md:grid-cols-3 gap-3 ${MOCK_UI(USE_MOCKS, { badge: false })}`}>
        <StatusRow title="KYC Status" value={seed.kycStatus!} tone="success" />
        <StatusRow title="AML Status" value={seed.amlStatus!} tone="warning" />
        <StatusRow title="Risk Assessment" value={seed.riskStatus!} tone="success" />
      </div>

      {/* Portfolio Risk Assessment */}
      <Card className={MOCK_UI(USE_MOCKS)}>
        <CardHeader className="pb-3">
          <CardTitle>Portfolio Risk Assessment</CardTitle>
          <CardDescription>Current and historical assessments</CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {items.map((r, idx) => {
            const isActive = r.status === "Effective";
            const tone: Tone = isActive ? "success" : "warning";
            return (
              <div
                key={idx}
                className={`rounded-lg border p-4 ${isActive ? "" : "bg-amber-50/60"}`}
              >
                {/* Tags row */}
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <Badge className={toneCls[tone]}>{r.status}</Badge>
                  {r.tags?.map((t, i) => (
                    <Badge key={i} variant="secondary">
                      {t}
                    </Badge>
                  ))}
                </div>

                {/* Main row: left (rating & details) + right (justification) */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  {/* Left: rating box + details */}
                  <div className="lg:col-span-2 space-y-3">
                    <div className="flex items-center gap-6">
                      <div
                        className={`grid h-20 w-20 place-items-center rounded-lg border-2 text-3xl font-bold ${isActive ? "border-emerald-300 text-emerald-600" : "border-amber-300 text-amber-600"
                          }`}
                        title="Risk Rating"
                      >
                        {r.rating}
                      </div>
                      <div className="text-sm">
                        <div className="font-medium">{r.label}</div>
                        <div className="text-muted-foreground">{r.objective}</div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-1 gap-x-8 text-sm">
                      <Field k="Expected return" v={r.expected_return} />
                      <Field k="Expected volatility" v={r.expected_volatility} />
                      <Field k="Accept asset value declines" v={r.declines} />
                      <Field k="Time Horizon" v={r.time_horizon} />
                      <Field k="Liquidity" v={r.liquidity} className="sm:col-span-2" />
                    </div>
                  </div>

                  {/* Right: justification block */}
                  <div className="lg:col-span-1">
                    <div className="text-sm font-medium mb-1">Justification</div>
                    <div className="rounded-md border bg-white p-3 text-sm text-muted-foreground min-h-[120px]">
                      {r.justification}
                    </div>
                  </div>
                </div>

                {/* Footer row: dates + actions */}
                <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs text-muted-foreground">
                  <div className="flex flex-wrap gap-6">
                    <div>Effective Date: {fmt(r.effective_date)}</div>
                    <div>Expiration Date: {fmt(r.expiration_date)}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => openEdit(idx)}>
                      <Pencil className="mr-2 h-4 w-4" />
                      Edit
                    </Button>
                    {!isActive && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-rose-600 hover:text-rose-700"
                        onClick={() => confirmDelete(idx)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* EDIT DIALOG */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Risk Assessment</DialogTitle>
            <DialogDescription>Update the assessment details and save your changes.</DialogDescription>
          </DialogHeader>

          {form && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label className="mb-1 block">Status</Label>
                <Select
                  value={form.status}
                  onValueChange={(v) => handleForm("status", v as RiskRecord["status"])}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Effective">Effective</SelectItem>
                    <SelectItem value="Expired">Expired</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="mb-1 block">Rating</Label>
                <Input
                  type="number"
                  min={1}
                  value={form.rating}
                  onChange={(e) => handleForm("rating", Number(e.target.value))}
                />
              </div>

              <div className="sm:col-span-2">
                <Label className="mb-1 block">Label</Label>
                <Input value={form.label} onChange={(e) => handleForm("label", e.target.value)} />
              </div>

              <div className="sm:col-span-2">
                <Label className="mb-1 block">Objective</Label>
                <Textarea rows={2} value={form.objective} onChange={(e) => handleForm("objective", e.target.value)} />
              </div>

              <div>
                <Label className="mb-1 block">Expected return</Label>
                <Input value={form.expected_return} onChange={(e) => handleForm("expected_return", e.target.value)} />
              </div>

              <div>
                <Label className="mb-1 block">Expected volatility</Label>
                <Input value={form.expected_volatility} onChange={(e) => handleForm("expected_volatility", e.target.value)} />
              </div>

              <div>
                <Label className="mb-1 block">Declines</Label>
                <Input value={form.declines} onChange={(e) => handleForm("declines", e.target.value)} />
              </div>

              <div>
                <Label className="mb-1 block">Time horizon</Label>
                <Input value={form.time_horizon} onChange={(e) => handleForm("time_horizon", e.target.value)} />
              </div>

              <div className="sm:col-span-2">
                <Label className="mb-1 block">Liquidity</Label>
                <Input value={form.liquidity} onChange={(e) => handleForm("liquidity", e.target.value)} />
              </div>

              <div className="sm:col-span-2">
                <Label className="mb-1 block">Justification</Label>
                <Textarea rows={3} value={form.justification} onChange={(e) => handleForm("justification", e.target.value)} />
              </div>

              <div>
                <Label className="mb-1 block">Effective date</Label>
                <Input
                  type="date"
                  value={form.effective_date}
                  onChange={(e) => handleForm("effective_date", e.target.value)}
                />
              </div>

              <div>
                <Label className="mb-1 block">Expiration date</Label>
                <Input
                  type="date"
                  value={form.expiration_date}
                  onChange={(e) => handleForm("expiration_date", e.target.value)}
                />
              </div>

              <div className="sm:col-span-2">
                <Label className="mb-1 block">Tags (comma separated)</Label>
                <Input
                  value={(form.tags ?? []).join(", ")}
                  onChange={(e) =>
                    handleForm(
                      "tags",
                      e.target.value
                        .split(",")
                        .map((s) => s.trim())
                        .filter(Boolean)
                    )
                  }
                />
              </div>
            </div>
          )}

          <DialogFooter className="mt-2">
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button onClick={saveEdit}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DELETE CONFIRMATION */}
      <AlertDialog open={delOpen} onOpenChange={setDelOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this assessment?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The assessment will be removed from the client’s history.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-rose-600 hover:bg-rose-700" onClick={doDelete}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function Field({
  k,
  v,
  className = "",
}: {
  k: string;
  v?: string | number;
  className?: string;
}) {
  return (
    <div className={`grid grid-cols-12 gap-2 ${className}`}>
      <div className="col-span-6 text-muted-foreground">{k}</div>
      <div className="col-span-6">{v ?? "—"}</div>
    </div>
  );
}
