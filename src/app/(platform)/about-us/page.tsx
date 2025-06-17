"use client";
import React from "react";
import Image from "next/image";
import Link from "next/link";
import { CheckCircle, Banknote, FileText, Shield } from "lucide-react";

const supportedBanks = [
  {
    name: "Bank of Singapore",
    logo: "/banks/bank-of-singapore.jpeg",
    url: "https://www.bankofsingapore.com/",
  },
  {
    name: "Credit Agricole",
    logo: "/banks/credit-agricole.jpeg",
    url: "https://www.credit-agricole.com/",
  },
  { name: "iFAST", logo: "/banks/ifast.jpeg", url: "https://www.ifastcorp.com/" },
  {
    name: "J. Safra-Sarasin",
    logo: "/banks/j-safra-sarasin.jpeg",
    url: "https://www.jsafrasarasin.com/",
  },
  { name: "LGT", logo: "/banks/lgt.jpeg", url: "https://www.lgt.com/" },
  { name: "Nomura", logo: "/banks/nomura.jpeg", url: "https://www.nomura.com/" },
  {
    name: "Standard Chartered",
    logo: "/banks/standard-chartered.jpeg",
    url: "https://www.sc.com/",
  },
  { name: "UBP", logo: "/banks/ubp.jpeg", url: "https://www.ubp.com/" },
  { name: "UBS", logo: "/banks/ubs.jpeg", url: "https://www.ubs.com/" },
  { name: "UOB", logo: "/banks/uob.jpeg", url: "https://www.uobgroup.com/" },
];

const featureItems = [
  { icon: FileText, label: "PDF bank statements parsed in seconds" },
  { icon: Banknote, label: "Multi-asset classification & performance tracking" },
  { icon: CheckCircle, label: "Actionable dashboards & exportable reports" },
  { icon: Shield, label: "Enterprise-grade security & privacy" },
];

export default function AboutPage() {
  return (
    <main className="flex flex-col gap-24 px-4 sm:px-8 md:px-12 xl:px-24 max-w-7xl mx-auto">
      {/* ─────────────────────────  1 ▸ Hero  ───────────────────────── */}
      <section className="text-center max-w-3xl mx-auto pt-12">
        <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight">
          Wealth Pilot<span className="text-primary">.</span>
        </h1>
        <p className="mt-4 text-lg text-muted-foreground leading-7">
          The modern fintech platform that turns raw PDF bank statements into clean, structured intelligence — so you
          can spend more time advising and less time wrangling data.
        </p>
      </section>

      {/* ─────────────────────────  2 ▸ Feature grid  ───────────────────────── */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
        {featureItems.map(({ icon: Icon, label }) => (
          <div
            key={label}
            className="flex flex-col items-center text-center gap-3 px-6 py-8 rounded-2xl border hover:shadow-sm transition"
          >
            <Icon className="h-8 w-8 text-primary" strokeWidth={1.6} />
            <p className="text-sm font-medium">{label}</p>
          </div>
        ))}
      </section>

      {/* ─────────────────────────  3 ▸ About copy  ───────────────────────── */}
      <section className="prose prose-gray max-w-4xl mx-auto text-muted-foreground">
        <p>
          Wealth Pilot was built by a team of asset-management veterans and AI engineers who were tired of copy-pasting
          numbers from PDFs. Our platform automatically extracts every holding, trade, and cash flow, enriches it with
          market data, and delivers investor-ready reporting at scale.
        </p>
        <p>
          Whether you’re a family office, external asset manager, or independent adviser, Wealth Pilot lets you unite
          fragmented statements into one source of truth — without rebuilding your tech stack.
        </p>
      </section>

      {/* ─────────────────────────  4 ▸ Supported Institutions  ───────────────────────── */}
      <section className="flex flex-col gap-10 mb-20">
        <h2 className="text-center text-2xl font-semibold tracking-tight">Supported Institutions</h2>
        {(() => {
          // pattern can be any array, e.g. [3, 2, 3]
          const pattern = [3, 4, 3];
          const rows: any[][] = [];
          let cursor = 0;

          pattern.forEach((size) => {
            if (cursor >= supportedBanks.length) return; // safety
            rows.push(supportedBanks.slice(cursor, cursor + size));
            cursor += size;
          });

          // put any leftovers into a final row (optional)
          if (cursor < supportedBanks.length) {
            rows.push(supportedBanks.slice(cursor));
          }

          return rows.map((row, rowIdx) => (
            <div key={`row-${rowIdx}`} className="flex justify-center gap-20 flex-wrap">
              {row.map((bank) => (
                <Link
                  key={bank.name}
                  href={bank.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex flex-col items-center"
                >
                  <Image
                    src={bank.logo}
                    alt={bank.name}
                    width={120}
                    height={48}
                    className="object-contain grayscale group-hover:grayscale-0 transition"
                  />
                  {/* <span className="text-xs text-muted-foreground mt-1">{bank.name}</span> */}
                </Link>
              ))}
            </div>
          ));
        })()}
      </section>
    </main>
  );
}
