"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldCheck, FileText, Eye } from "lucide-react";

const mockComplianceStats = [
  {
    icon: ShieldCheck,
    label: "KYC Verified Clients",
    value: 128,
    description: "All client accounts passed identity checks.",
  },
  {
    icon: FileText,
    label: "Audit Logs Reviewed",
    value: 3421,
    description: "Detailed logs stored for every action.",
  },
  {
    icon: Eye,
    label: "Surveillance Flags",
    value: 5,
    description: "Suspicious trades detected this month.",
  },
];

export default function CompliancePage() {
  return (
    <main className="flex flex-col gap-16 px-4 sm:px-8 md:px-12 xl:px-24 max-w-7xl mx-auto">
      {/* ─────────────────────────  1 ▸ Header  ───────────────────────── */}
      <section className="text-center max-w-3xl mx-auto pt-12">
        <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight">
          Compliance & Monitoring<span className="text-primary">.</span>
        </h1>
        <p className="mt-4 text-lg text-muted-foreground leading-7">
          Stay compliant and audit-ready with transparent, secure, and automated oversight for your firm’s most critical
          activities.
        </p>
      </section>

      {/* ─────────────────────────  2 ▸ Stats Cards  ───────────────────────── */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
        {mockComplianceStats.map(({ icon: Icon, label, value, description }) => (
          <Card key={label}>
            <CardHeader className="flex items-center gap-4">
              <Icon className="w-6 h-6 text-primary" strokeWidth={1.6} />
              <CardTitle className="text-base">{label}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-semibold mb-1">{value}</div>
              <p className="text-muted-foreground text-sm leading-6">{description}</p>
            </CardContent>
          </Card>
        ))}
      </section>

      {/* ─────────────────────────  3 ▸ Description  ───────────────────────── */}
      <section className="prose prose-gray max-w-4xl mx-auto text-muted-foreground mb-24">
        <p>
          Wealth Pilot’s compliance module ensures seamless integration with KYC/AML workflows, offers full traceability
          via audit logs, and applies trade surveillance checks to flag anomalies. Every user action is securely logged
          and encrypted, enabling you to meet regulatory standards without overhead.
        </p>
        <p>
          Our systems are designed with regulators in mind — ensuring transparency, accountability, and control over
          every transaction and data entry.
        </p>
      </section>
    </main>
  );
}
