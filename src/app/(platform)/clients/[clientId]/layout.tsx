"use client";

import { ReactNode, useEffect } from "react";
import { useRouter, useSelectedLayoutSegment, useParams } from "next/navigation";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useClientStore } from "@/stores/clients-store";

export default function ClientLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const segment = useSelectedLayoutSegment();
  const { clientId } = useParams<{ clientId: string }>();
  const { setCurrClient, clients } = useClientStore();

  useEffect(() => {
    if (clientId) setCurrClient(clientId);
  }, [clientId, setCurrClient]);

  const tabs = [
    { slug: "profile", label: "Profile" },
    { slug: "custodians", label: "Custodians" },
    { slug: "assets", label: "Assets" },
    { slug: "compliance", label: "Compliance" },
    { slug: "documents", label: "Documents" },
    { slug: "settings", label: "Client Settings" },
  ] as const;

  const base = `/clients/${clientId ?? ""}`;
  const active = (segment ?? "assets") as (typeof tabs)[number]["slug"];

  return (
    <div className="flex flex-col h-full">
      {/* Sticky TOP ribbon (no extra bottom spacing) */}
      <div className="sticky top-0 z-40 bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/70 border-b">
        <div className="px-4 pt-3 pb-0"> {/* ⬅ pb-0: remove bottom padding */}
          <Tabs
            value={active}
            onValueChange={(val) => {
              if (val !== active) router.push(`${base}/${val}`);
            }}
            className="w-full"
          >
            <TabsList className="grid w-full sm:w-auto sm:inline-grid grid-cols-2 sm:grid-cols-6">
              {tabs.map((t) => (
                <TabsTrigger key={t.slug} value={t.slug}>
                  {t.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>
      </div>

      {children}
    </div>
  );
}