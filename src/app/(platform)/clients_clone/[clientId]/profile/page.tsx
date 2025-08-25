"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";

import { useClientStore } from "@/stores/clients-store";
import {
  Card, CardHeader, CardTitle, CardDescription, CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Pencil, AlertCircleIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { USE_MOCKS } from "@/lib/dev-logger";

/* ──────────────────────────────────────────────── helpers ─────────────────────────────────────────────── */

const dash = (v: unknown) => (v === undefined || v === null || v === "" ? "—" : String(v));
const yesNo = (v?: boolean | string) => (typeof v === "boolean" ? (v ? "Yes" : "No") : dash(v));
const shortCode = (code?: string | number) => (String(code ?? "").replace(/[^A-Za-z]/g, "").slice(0, 4).toUpperCase()) || "ID";

/** format "admin / 2025-08-10T10:30:00.000Z" → "admin / 2025-08-10 10:30:00" */
function fmtIso(ts?: string) {
  if (!ts) return undefined;
  const d = new Date(ts);
  if (isNaN(+d)) return ts;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}
/** value → string suitable for <input type="datetime-local"> */
function toInputDateTime(v: any) {
  if (!v) return "";
  const d = new Date(v);
  if (isNaN(d.getTime())) return "";                   // guard invalid values like "—", "N/A"
  // datetime-local expects local time (no Z). Shift by timezone offset.
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 19);
}

function ageFromDOB(dob?: string) {
  if (!dob) return undefined;
  const d = new Date(dob);
  if (isNaN(+d)) return undefined;
  const now = new Date();
  let a = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) a--;
  return a;
}

/* ──────────────────────────────────────────────── types ─────────────────────────────────────────────── */

type ProfileShape = {
  // basic
  client_attributes?: string;
  chinese_name?: string;
  gender?: string;
  introducer?: string;
  referred_client?: string;
  referral_id?: string;
  remarks?: string;
  created_by?: string;
  created_at?: string;
  updated_by?: string;
  updated_at?: string;
  mfo_agreement_date?: string;
  client_type?: string;

  // personal
  location?: string;
  nationality?: string;
  identity_id?: string;
  dob?: string;
  marital_status?: string;
  employed?: boolean;
  profession?: string;
  company?: string;
  tin?: string;
  tin_country?: string;
  us_person_declaration?: string;
  school?: string;
  education_level?: string;
  personal_remarks?: string;
  children_count?: number;

  // contact
  preferred_contact?: string;
  email?: string;
  phone?: string;
  fax?: string;
  address?: string;
  contact_remarks?: string;

  // BO
  institution_name?: string;
  organization_type?: string;
  registered_address?: string;
  publicly_traded?: boolean;
  bo_control_type?: string;
  boc_remarks?: string;

  associated_clients?: Array<{
    relationship?: string;
    custodian?: string;
    account_name?: string;
    account_number?: string | number;
    investment_strategy?: string;
    institution?: string;
  }>;
};

/** Upstream/DB payload from /api/clients/profile */
type ApiProfile = {
  basic?: any;
  personal?: any;
  contact?: any;
  associated_clients?: any[];
};

/* ──────────────────────────────────────────────── component ─────────────────────────────────────────────── */

export default function ProfilePage() {
  const { clientId } = useParams<{ clientId: string }>();
  const { setCurrClient, clients } = useClientStore();
  useEffect(() => {
    if (clientId) setCurrClient(clientId);
  }, [clientId, setCurrClient]);

  const c = clientId ? clients[clientId] : undefined;

  const [status, setStatus] =
    useState<"idle" | "loading" | "error" | "ready">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [apiData, setApiData] = useState<ApiProfile | null>(null);
  const [mockFile, setMockFile] = useState<ProfileShape | null>(null);

  /* fetch through same-origin proxy → no CORS */
  async function refetch() {
    if (!clientId) return;

    setStatus("loading");
    setErrorMsg("");
    setApiData(null);
    setMockFile(null);

    let gotLive = false;

    // 1) Try LIVE (DB) first: curl -s -X POST http://localhost:3001/api/clients/profile   -H 'content-type: application/json'   -d '{"client_id":44}'
    try {
      const res = await fetch("/api/clients/profile", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ client_id: Number(clientId) }),
      });

      if (!res.ok) {
        // try to read API error message
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody?.error ?? "Profile not found (API).");
      }

      const payload = (await res.json()) as ApiProfile;

      // optional: treat totally empty payload as an error
      const hasAny =
        (payload?.basic && Object.keys(payload.basic).length) ||
        (payload?.personal && Object.keys(payload.personal).length) ||
        (payload?.contact && Object.keys(payload.contact).length) ||
        (payload?.associated_clients?.length ?? 0) > 0;

      if (!hasAny) throw new Error("Empty profile (API).");

      setApiData(payload);
      setStatus("ready");
      gotLive = true;
      // console.log("network live");
      return; // ✅ stop here — do NOT fetch mock
    } catch (err: any) {
      // If USE_MOCKS is off, surface the live error
      if (!USE_MOCKS) {
        setStatus("error");
        setErrorMsg(err?.message || "Failed to load profile.");
        return;
      }
      // else fall through to mock fetch
    }

    // 2) Fallback to MOCK *only if* the live fetch failed
    if (USE_MOCKS && !gotLive) {
      try {
        const m = await fetch(`/mocks/profile.${clientId}.json`, { cache: "no-store" });
        if (!m.ok) throw new Error("Mock file not found");
        const mock = (await m.json()) as ProfileShape;
        setMockFile(mock);
        setStatus("ready");
        // console.log("network mock");
      } catch (err: any) {
        setStatus("error");
        setErrorMsg(err?.message || "Failed to load profile (mock fallback).");
      }
    }
  }


  useEffect(() => { void refetch(); }, [clientId]);

  const sBasic = apiData?.basic ?? {};
  const sPersonal = apiData?.personal ?? {};
  const sContact = apiData?.contact ?? {};

  const ui: ProfileShape = useMemo(() => {
    const fromApi: ProfileShape = {
      // basic
      client_attributes: sBasic.tier_label,
      chinese_name: sBasic.chinese_name,
      gender: sBasic.gender,
      introducer: sBasic.introducer,
      referred_client: sBasic.referred_client,
      referral_id: sBasic.referral,
      remarks: sBasic.remarks,
      created_by: sBasic.created_by,
      created_at: sBasic.created_at,
      updated_by: sBasic.updated_by,
      updated_at: sBasic.updated_at,
      mfo_agreement_date: sBasic.mfo_agreement_signed_on,
      client_type: sBasic.type,

      // personal
      location: sPersonal.location,
      nationality: sPersonal.nationality,
      identity_id: sPersonal.identity_id,
      dob: sPersonal.date_of_birth,
      marital_status: sPersonal.marital_status,
      employed: sPersonal.employed,
      profession: sPersonal.profession,
      company: sPersonal.company,
      tin: sPersonal.tin,
      tin_country: sPersonal.country_of_tin,
      us_person_declaration: sPersonal.is_us_person ? "Yes" : "No",
      school: sPersonal.school,
      education_level: sPersonal.education_level,
      personal_remarks: sPersonal.remarks,
      children_count: sPersonal.number_of_children,

      // contact
      preferred_contact: sContact.preferred_comm,
      email: sContact.email,
      phone: sContact.phone,
      fax: sContact.fax,
      address: sContact.address,
      contact_remarks: sContact.remarks,

      // bo/control
      institution_name: sPersonal.company,
      organization_type: sBasic.organization_type,
      registered_address: sBasic.registered_address,
      publicly_traded: sBasic.publicly_traded,
      bo_control_type: sBasic.bo_control_type,
      boc_remarks: sBasic.boc_remarks,

      associated_clients: (apiData?.associated_clients ?? []).map((r: any) => ({
        relationship: r.label || r.relationship || r.relationship_type,
        custodian: r.custodian,
        account_name: r.account_name,
        account_number: r.account_number,
        investment_strategy: r.investment_strategy,
        institution: r.institution,
      })),
    };
    return { ...fromApi, ...(mockFile ?? {}) };
  }, [apiData, mockFile, sBasic, sContact, sPersonal]);

  const computedAge = ageFromDOB(ui.dob);
  const codeFromBasic = sBasic.code ?? clientId;
  const statusFromBasic = sBasic.status ?? "—";
  const clientType = ui.client_type ?? "Corporate";

  /* ───────── edit dialog (basic / personal / contact) ───────── */

  type Section = "basic" | "personal" | "contact";
  const [dialogOpen, setDialogOpen] = useState(false);
  const [section, setSection] = useState<Section>("basic");
  const [form, setForm] = useState<Record<string, any>>({});

  function openEdit(sec: Section) {
    setSection(sec);
    // prime dialog with current values
    setForm(
      sec === "basic"
        ? {
            tier_label: ui.client_attributes,
            chinese_name: ui.chinese_name,
            gender: ui.gender,
            introducer: ui.introducer,
            referred_client: ui.referred_client,
            referral: ui.referral_id,
            remarks: ui.remarks,
            mfo_agreement_signed_on: ui.mfo_agreement_date,
            created_by: sBasic.created_by,
            created_at: sBasic.created_at,
            updated_by: sBasic.updated_by,
            updated_at: sBasic.updated_at,
          }
        : sec === "personal"
        ? {
            location: ui.location,
            nationality: ui.nationality,
            identity_id: ui.identity_id,
            date_of_birth: ui.dob,
            marital_status: ui.marital_status,
            employed: ui.employed,
            number_of_children: ui.children_count,
            profession: ui.profession,
            company: ui.company,
            tin: ui.tin,
            country_of_tin: ui.tin_country,
            is_us_person: (ui.us_person_declaration ?? "").toString().toLowerCase() === "yes",
            school: ui.school,
            education_level: ui.education_level,
            remarks: ui.personal_remarks,
          }
        : {
            preferred_comm: ui.preferred_contact,
            email: ui.email,
            phone: ui.phone,
            fax: ui.fax,
            address: ui.address,
            remarks: ui.contact_remarks,
          }
    );
    setDialogOpen(true);
  }
  const setF = (k: string, v: any) => setForm((f) => ({ ...f, [k]: v }));

  async function saveEdit() {
    if (!clientId) return;
    const res = await fetch("/api/clients/profile/update", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        client_id: Number(clientId),
        section,
        values: form,
      }),
    });
    if (!res.ok) {
      const e = await res.json().catch(() => ({}));
      alert(e?.error ?? "Update failed");
      return;
    }
    setDialogOpen(false);
    await refetch();
  }

  /* ───────── UI helpers ───────── */

  const Field = ({ k, v }: { k: string; v?: string | number }) => (
    <div className="grid grid-cols-12 gap-2 py-1 text-sm">
      <div className="col-span-5 md:col-span-4 text-muted-foreground">{k}</div>
      <div className="col-span-7 md:col-span-8 break-words">{dash(v)}</div>
    </div>
  );
  const SectionTitle = ({ children }: { children: React.ReactNode }) => (
    <div className="text-sm font-semibold text-primary border-b border-primary/30 pb-1">
      {children}
    </div>
  );

  /** Header with on-click edit icon (used for Contacts) */
  const SectionHeader = ({ title, onEdit }: { title: string; onEdit?: () => void }) => (
    <div className="flex items-center justify-between text-sm font-semibold text-primary border-b border-primary/30 pb-1">
      <span>{title}</span>
      {onEdit && (
        <button
          className="p-1 rounded hover:bg-muted"
          onClick={onEdit}
          aria-label={`Edit ${title}`}
        >
          <Pencil className="h-4 w-4 text-muted-foreground" />
        </button>
      )}
    </div>
  );

  if (status === "loading" || status === "idle") {
    return (
      <div className="p-4 space-y-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card className="lg:col-span-1">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Basic Info</CardTitle>
              <CardDescription>Loading…</CardDescription>
            </CardHeader>
            <CardContent>
              <Skeleton className="h-6 w-1/3 mb-4" />
              {Array.from({ length: 10 }).map((_, i) => (
                <Skeleton key={i} className="h-4 w-full mb-2" />
              ))}
            </CardContent>
          </Card>
          <Card className="lg:col-span-2">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Info List</CardTitle>
            </CardHeader>
            <CardContent>
              {Array.from({ length: 16 }).map((_, i) => (
                <Skeleton key={i} className="h-4 w-full mb-2" />
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="p-4">
        <Alert variant="destructive">
          <AlertCircleIcon className="h-5 w-5" />
          <AlertTitle>Unable to load profile</AlertTitle>
        <AlertDescription>{errorMsg}</AlertDescription>
        </Alert>
      </div>
    );
  }

  /* ──────────────────────────────────────────────── render ─────────────────────────────────────────────── */

  return (
    <div className="p-4 space-y-4">
      <Tabs defaultValue="kyc">
        <div className="flex items-center justify-between">
          <div className="h-2" />
          <TabsList className="grid grid-cols-2 w-[300px]">
            <TabsTrigger value="kyc">KYC Info</TabsTrigger>
            <TabsTrigger value="assoc">Associated Clients</TabsTrigger>
          </TabsList>
        </div>

        {/* KYC INFO */}
        <TabsContent value="kyc" className="space-y-4 mt-2">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* LEFT — BASIC */}
            <Card className="lg:col-span-1">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="rounded-full border px-2 py-0.5 text-xs">
                      {shortCode(codeFromBasic)}
                    </div>
                    <CardTitle className="text-base">Basic Info</CardTitle>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => openEdit("basic")}>
                    <Pencil className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </div>
                <CardDescription>{clientType}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mb-3">
                  <Badge variant="secondary">{statusFromBasic}</Badge>
                </div>

                <div className="text-sm font-medium mb-2">Personal Information</div>
                <div className="space-y-1.5">
                  <Field k="Client Attributes" v={ui.client_attributes ?? "Premium Client"} />
                  <Field k="Chinese Name" v={ui.chinese_name} />
                  <Field k={"Client's Gender"} v={ui.gender ?? "Corporate"} />
                  <Field k="Client Code" v={codeFromBasic} />
                  <Field k={"Client's Title"} v={c?.name} />
                  <Field k="MFO agreement signed date" v={ui.mfo_agreement_date && fmtIso(ui.mfo_agreement_date)} />
                  <Field k="Introducer" v={ui.introducer} />
                  <Field k="Referred Client" v={ui.referred_client} />
                  <Field k="Referral" v={ui.referral_id} />
                  <Field k="Remarks" v={ui.remarks} />
                  <Field
                    k="Create User / Time"
                    v={
                      sBasic.created_by && sBasic.created_at
                        ? `${sBasic.created_by} / ${fmtIso(sBasic.created_at)}`
                        : undefined
                    }
                  />
                  <Field
                    k="Update User / Time"
                    v={
                      sBasic.updated_by && sBasic.updated_at
                        ? `${sBasic.updated_by} / ${fmtIso(sBasic.updated_at)}`
                        : undefined
                    }
                  />
                </div>
              </CardContent>
            </Card>

            {/* RIGHT — INFO LIST */}
            <Card className="lg:col-span-2">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Info List</CardTitle>
                  <Button variant="ghost" size="icon" onClick={() => openEdit("personal")}>
                    <Pencil className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-5">
                {/* Personal */}
                <div>
                  <SectionTitle>Personal</SectionTitle>
                  <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-x-8">
                    <Field k="Location" v={ui.location} />
                    <Field k="Nationality" v={ui.nationality} />
                    <Field k="Identity ID" v={ui.identity_id} />
                    <Field k="Date Of Birth" v={ui.dob && fmtIso(ui.dob)} />
                    <Field k="Age" v={computedAge} />
                    <Field k="Marital Status" v={ui.marital_status} />
                    <Field k="Number of Children" v={ui.children_count ?? 0} />
                    <Field k="Employed" v={yesNo(ui.employed)} />
                    <Field k="Profession" v={ui.profession ?? "Financial Services"} />
                    <Field k="Company" v={ui.company} />
                    <Field k="TIN" v={ui.tin} />
                    <Field k="Country of TIN" v={ui.tin_country ?? "USA"} />
                    <Field k="US Person Declaration" v={ui.us_person_declaration ?? "No"} />
                    <Field k="School" v={ui.school ?? "Harvard Business School"} />
                    <Field k="Education Level" v={ui.education_level ?? "Graduate Degree"} />
                    <Field k="Remarks" v={ui.personal_remarks ?? "--"} />
                  </div>
                </div>

                {/* Contacts (header with edit icon) */}
                <div>
                  <SectionHeader title="Contacts" onEdit={() => openEdit("contact")} />
                  <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-x-8">
                    <Field k="Preferred Method of Communication" v={ui.preferred_contact ?? "Email & Phone"} />
                    <Field k="Email Address" v={ui.email} />
                    <Field k="Address" v={ui.address} />
                    <Field k="Phone No." v={ui.phone} />
                    <Field k="Fax No." v={ui.fax ?? "N/A"} />
                    <Field k="Remarks" v={ui.contact_remarks ?? "--"} />
                  </div>
                </div>

                {/* Beneficial Ownership and Control */}
                <div>
                  <SectionTitle>Beneficial Ownership and Control</SectionTitle>
                  <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-x-8">
                    <Field k="Institution Name" v={ui.institution_name ?? ui.company} />
                    <Field k="100% Ownership" v={ui.publicly_traded ? "No (Publicly Traded)" : "Yes"} />
                    <Field k="Type of Organization" v={ui.organization_type ?? "Public Corporation"} />
                    <Field k="Type of BO / Control" v={ui.bo_control_type ?? "Board Control"} />
                    <Field k="Registered Address" v={ui.registered_address} />
                    <Field k="Remarks" v={ui.boc_remarks ?? "--"} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ASSOCIATED CLIENTS */}
        <TabsContent value="assoc" className="mt-2">
          <Card>
            <CardHeader>
              <CardTitle>Associated Clients</CardTitle>
              <CardDescription>Linked client relationships</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-left text-muted-foreground">
                    <tr>
                      <th className="py-2 pr-4">Relationship / Client&apos;s Name</th>
                      <th className="py-2 pr-4">Custodian</th>
                      <th className="py-2 pr-4">Account Name</th>
                      <th className="py-2 pr-4">Account Number</th>
                      <th className="py-2 pr-4">Investment Strategy</th>
                      <th className="py-2 pr-2">Institution</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(ui.associated_clients ?? []).length
                      ? (ui.associated_clients ?? []).map((r, i) => (
                          <tr key={i} className="border-t">
                            <td className="py-2 pr-4">{dash(r.relationship)}</td>
                            <td className="py-2 pr-4">{dash(r.custodian)}</td>
                            <td className="py-2 pr-4">{dash(r.account_name)}</td>
                            <td className="py-2 pr-4">{dash(r.account_number)}</td>
                            <td className="py-2 pr-4">{dash(r.investment_strategy)}</td>
                            <td className="py-2 pr-2">{dash(r.institution)}</td>
                          </tr>
                        ))
                      : [
                          <tr key="placeholder" className="border-t">
                            <td className="py-2 pr-4">—</td>
                            <td className="py-2 pr-4">—</td>
                            <td className="py-2 pr-4">—</td>
                            <td className="py-2 pr-4">—</td>
                            <td className="py-2 pr-4">—</td>
                            <td className="py-2 pr-2">—</td>
                          </tr>,
                        ]}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* EDIT DIALOG */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              Edit {section === "basic" ? "Basic Info" : section === "personal" ? "Personal" : "Contacts"}
            </DialogTitle>
            <DialogDescription>Update the fields and save your changes.</DialogDescription>
          </DialogHeader>

          {/* Dynamic form */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {Object.entries(form).map(([k, v]) => (
              <div key={k} className="space-y-1">
                <div className="text-xs text-muted-foreground">{k}</div>

                {typeof v === "boolean" ? (
                  <select
                    className="border rounded px-2 py-1 h-9 text-sm"
                    value={v ? "true" : "false"}
                    onChange={(e) => setF(k, e.target.value === "true")}
                  >
                    <option value="true">true</option>
                    <option value="false">false</option>
                  </select>
                ) : /(^|_)date($|_)/i.test(k) || /_at$/.test(k) ? (
                  // safe conversion for datetime-local
                  <Input
                    type="datetime-local"
                    value={toInputDateTime(v)}
                    onChange={(e) =>
                      setF(k, e.target.value ? new Date(e.target.value).toISOString() : null)
                    }
                  />
                ) : (
                  <Input value={v ?? ""} onChange={(e) => setF(k, e.target.value)} />
                )}
              </div>
            ))}
          </div>

          <DialogFooter className="mt-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={saveEdit}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
