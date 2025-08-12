"use client";

import { useEffect, useMemo, useState } from "react";
import { useClientStore } from "@/stores/clients-store";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Pencil } from "lucide-react";

/** Optional mock profile shape (loaded from /public/mocks/profile.<id>.json if present). */
type ProfileMock = {
  // Left card
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

  // Right card – Personal
  location?: string;
  nationality?: string;
  identity_id?: string;
  dob?: string; // YYYY-MM-DD
  established_year?: number;
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

  // Contacts
  preferred_contact?: string;
  email?: string;
  phone?: string;
  fax?: string;
  address?: string;
  contact_remarks?: string;

  // BO & Control
  institution_name?: string;
  organization_type?: string;
  registered_address?: string;
  publicly_traded?: boolean;
  bo_control_type?: string;
  boc_remarks?: string;

  // Associated clients
  associated_clients?: Array<{
    relationship?: string;
    custodian?: string;
    account_name?: string;
    account_number?: string | number;
    investment_strategy?: string;
    institution?: string;
  }>;
};

const dash = (v: unknown) => (v === undefined || v === null || v === "" ? "—" : String(v));
const yesNo = (v?: boolean | string) => (typeof v === "boolean" ? (v ? "Yes" : "No") : dash(v));
const shortCode = (code?: string | number) =>
  (String(code ?? "")
    .replace(/[^A-Za-z]/g, "")
    .slice(0, 4)
    .toUpperCase()) || "ID";

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
function ageFromEstablished(year?: number) {
  if (!year) return undefined;
  const now = new Date().getFullYear();
  return now - year;
}

export default function ProfilePage({ params }: { params: { clientId: string } }) {
  const { setCurrClient, clients } = useClientStore();
  const c = clients[params.clientId];
  const s = (c?.summary ?? {}) as any;

  const [mock, setMock] = useState<ProfileMock | null>(null);

  useEffect(() => {
    if (params.clientId) setCurrClient(params.clientId);
  }, [params.clientId, setCurrClient]);

  // Try to load optional mock profile JSON if you create /public/mocks/profile.<id>.json
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/mocks/profile.${params.clientId}.json`, { cache: "no-store" });
        if (!res.ok) return; // file not present — that’s fine
        const data = (await res.json()) as ProfileMock;
        if (!cancelled) setMock(data);
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [params.clientId]);

  // Merge store summary -> mock override (mock wins if provided)
  const p: ProfileMock = useMemo(
    () => ({
      client_attributes: s.client_attributes,
      chinese_name: s.chinese_name,
      gender: s.gender,
      introducer: s.introducer,
      referred_client: s.referred_client,
      referral_id: s.referral_id,
      remarks: s.remarks,
      created_by: s.created_by,
      created_at: s.created_at,
      updated_by: s.updated_by,
      updated_at: s.updated_at,
      mfo_agreement_date: s.mfo_agreement_date,
      client_type: s.client_type,

      location: s.location,
      nationality: s.nationality,
      identity_id: s.identity_id,
      dob: s.dob,
      established_year: s.established_year,
      marital_status: s.marital_status,
      employed: s.employed,
      profession: s.profession,
      company: s.company,
      tin: s.tin,
      tin_country: s.tin_country,
      us_person_declaration: s.us_person_declaration,
      school: s.school,
      education_level: s.education_level,
      personal_remarks: s.personal_remarks,
      children_count: s.children_count,

      preferred_contact: s.preferred_contact,
      email: s.email,
      phone: s.phone,
      fax: s.fax,
      address: s.address,
      contact_remarks: s.contact_remarks,

      institution_name: s.institution_name,
      organization_type: s.organization_type,
      registered_address: s.registered_address,
      publicly_traded: s.publicly_traded,
      bo_control_type: s.bo_control_type,
      boc_remarks: s.boc_remarks,

      associated_clients: s.associated_clients,
      ...(mock ?? {}),
    }),
    [s, mock]
  );

  const computedAge = ageFromDOB(p.dob) ?? ageFromEstablished(p.established_year);

  const Field = ({ k, v }: { k: string; v?: string | number }) => (
    <div className="grid grid-cols-12 gap-2 py-1 text-sm">
      <div className="col-span-5 md:col-span-4 text-muted-foreground">{k}</div>
      <div className="col-span-7 md:col-span-8 break-words">{dash(v)}</div>
    </div>
  );

  const SectionTitle = ({ children }: { children: React.ReactNode }) => (<div className="text-sm font-semibold text-primary border-b border-primary/30 pb-1">{children}</div>);

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
            {/* Left: Basic Info */}
            <Card className="lg:col-span-1">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="rounded-full border px-2 py-0.5 text-xs">{shortCode(s.code ?? params.clientId)}</div>
                    <CardTitle className="text-base">Basic Info</CardTitle>
                  </div>
                  <Pencil className="h-4 w-4 text-muted-foreground" />
                </div>
                <CardDescription>{p.client_type ?? "Corporate"}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mb-3">
                  <Badge variant="secondary">{s.status ?? "—"}</Badge>
                </div>

                <div className="text-sm font-medium mb-2">Personal Information</div>
                <div className="space-y-1.5">
                  <Field k="Client Attributes" v={p.client_attributes ?? "Premium Client"} />
                  <Field k="Chinese Name" v={p.chinese_name} />
                  <Field k={"Client's Gender"} v={p.gender ?? "Corporate"} />
                  <Field k="Client Code" v={s.code ?? params.clientId} />
                  <Field k={"Client's Title"} v={c?.name} />
                  <Field k="MFO agreement signed date" v={p.mfo_agreement_date} />
                  <Field k="Introducer" v={p.introducer} />
                  <Field k="Referred Client" v={p.referred_client} />
                  <Field k="Referral" v={p.referral_id} />
                  <Field k="Remarks" v={p.remarks} />
                  <Field k="Create User / Time" v={p.created_by && p.created_at ? `${p.created_by} / ${p.created_at}` : undefined} />
                  <Field k="Update User / Time" v={p.updated_by && p.updated_at ? `${p.updated_by} / ${p.updated_at}` : undefined} />
                </div>
              </CardContent>
            </Card>

            {/* Right: Info List */}
            <Card className="lg:col-span-2">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Info List</CardTitle>
                  <Pencil className="h-4 w-4 text-muted-foreground" />
                </div>
              </CardHeader>
              <CardContent className="space-y-5">
                {/* Personal */}
                <div>
                  <SectionTitle>Personal</SectionTitle>
                  <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-x-8">
                    <Field k="Location" v={p.location} />
                    <Field k="Nationality" v={p.nationality} />
                    <Field k="Identity ID" v={p.identity_id} />
                    <Field k="Date Of Birth" v={p.dob ?? "N/A"} />
                    <Field
                      k="Age"
                      v={
                        computedAge
                          ? p.established_year
                            ? `Est. ${p.established_year} (${computedAge} years)`
                            : `${computedAge} years`
                          : undefined
                      }
                    />
                    <Field k="Marital Status" v={p.marital_status ?? "N/A"} />
                    <Field k="Number of Children" v={p.children_count ?? 0} />
                    <Field k="Employed" v={yesNo(p.employed)} />
                    <Field k="Profession" v={p.profession ?? "Financial Services"} />
                    <Field k="Company" v={p.company} />
                    <Field k="TIN" v={p.tin} />
                    <Field k="Country of TIN" v={p.tin_country ?? "USA"} />
                    <Field k="US Person Declaration" v={p.us_person_declaration ?? "Yes"} />
                    <Field k="School" v={p.school ?? "Harvard Business School"} />
                    <Field k="Education Level" v={p.education_level ?? "Graduate Degree"} />
                    <Field k="Remarks" v={p.personal_remarks ?? "--"} />
                  </div>
                </div>

                {/* Contacts */}
                <div>
                  <SectionTitle>Contacts</SectionTitle>
                  <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-x-8">
                    <Field k="Preferred Method of Communication" v={p.preferred_contact ?? "Email & Phone"} />
                    <Field k="Email Address" v={p.email} />
                    <Field k="Address" v={p.address} />
                    <Field k="Phone No." v={p.phone} />
                    <Field k="Fax No." v={p.fax ?? "N/A"} />
                    <Field k="Remarks" v={p.contact_remarks ?? "--"} />
                  </div>
                </div>

                {/* Beneficial Ownership and Control */}
                <div>
                  <SectionTitle>Beneficial Ownership and Control</SectionTitle>
                  <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-x-8">
                    <Field k="Institution Name" v={p.institution_name ?? p.company} />
                    <Field k="100% Ownership" v={p.publicly_traded ? "No (Publicly Traded)" : "Yes"} />
                    <Field k="Type of Organization" v={p.organization_type ?? "Public Corporation"} />
                    <Field k="Type of BO / Control" v={p.bo_control_type ?? "Board Control"} />
                    <Field k="Registered Address" v={p.registered_address} />
                    <Field k="Remarks" v={p.boc_remarks ?? "--"} />
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
                    {(p.associated_clients ?? [
                      {
                        relationship: "Joint Account / Goldman Sachs Private Foundation",
                        custodian: "Credit Suisse SG",
                        account_name: "Foundation Investment Account",
                        account_number: "CS778899001",
                        investment_strategy: "ESG Focus",
                        institution: "Credit Suisse Singapore",
                      },
                    ]).map((r, i) => (
                      <tr key={i} className="border-t">
                        <td className="py-2 pr-4">{dash(r.relationship)}</td>
                        <td className="py-2 pr-4">{dash(r.custodian)}</td>
                        <td className="py-2 pr-4">{dash(r.account_name)}</td>
                        <td className="py-2 pr-4">{dash(r.account_number)}</td>
                        <td className="py-2 pr-4">{dash(r.investment_strategy)}</td>
                        <td className="py-2 pr-2">{dash(r.institution)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
