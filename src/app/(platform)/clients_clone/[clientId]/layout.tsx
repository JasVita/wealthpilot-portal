"use client";

import { ReactNode, useEffect } from "react";
import { useRouter, useSelectedLayoutSegment, useParams } from "next/navigation";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useClientStore } from "@/stores/clients-store";

export default function ClientLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const segment = useSelectedLayoutSegment(); // 'profile' | 'custodians' | 'assets' | 'compliance' | 'documents' | 'settings'
  const { clientId } = useParams<{ clientId: string }>();
  const { setCurrClient, clients } = useClientStore();

  // keep global "Current client" in sync with the URL id
  useEffect(() => {
    if (clientId) setCurrClient(clientId);
  }, [clientId, setCurrClient]);

  const tabs = [
    { slug: "profile", label: "Profile" },
    { slug: "custodians", label: "Custodians" },
    { slug: "assets", label: "Assets" }, // renamed from "overview"
    { slug: "compliance", label: "Compliance" },
    { slug: "documents", label: "Documents" },
    { slug: "settings", label: "Client Settings" },
  ] as const;

  const base = `/clients_clone/${clientId ?? ""}`;
  const active = (segment ?? "assets") as (typeof tabs)[number]["slug"];
  const displayName = clientId ? (clients[clientId]?.name ?? clientId) : "";

  return (
    <div className="flex flex-col h-full">
      {/* Tabs header */}
      <div className="px-4 pt-3 pb-2">
        <div className="flex flex-wrap gap-2">
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
