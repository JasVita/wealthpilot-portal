"use client";

import Link from "next/link";
import { useEffect, ReactNode } from "react";
import { useSelectedLayoutSegment, usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useClientStore } from "@/stores/clients-store";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function ClientLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: { clientId: string };
}) {
  const router = useRouter();
  const segment = useSelectedLayoutSegment(); // 'profile' | 'custodians' | 'assets' | 'compliance' | 'documents' | 'settings'
  const pathname = usePathname();
  const { setCurrClient, clients } = useClientStore();

  // keep global "Current client" in sync with the URL id
  useEffect(() => {
    if (params?.clientId) setCurrClient(params.clientId);
  }, [params?.clientId, setCurrClient]);

  const tabs = [
    { slug: "profile", label: "Profile" },
    { slug: "custodians", label: "Custodians" },
    { slug: "assets", label: "Assets" }, // renamed from "overview"
    { slug: "compliance", label: "Compliance" },
    { slug: "documents", label: "Documents" },
    { slug: "settings", label: "Client Settings" },
  ];

  const base = `/clients_clone/${params.clientId}`;
  const active = (segment ?? "assets") as (typeof tabs)[number]["slug"];
  const displayName = clients[params.clientId]?.name ?? params.clientId;

  return (
    <div className="flex flex-col h-full">
      {/* Tabs header */}
      <div className="px-4 pt-3 pb-2">
        <div className="text-sm text-muted-foreground mb-1">
          {/* <Link className="hover:underline" href="/clients_clone">Clients</Link>{" "}
          <span className="mx-1">›</span>
          <span className="font-medium">{displayName}</span> */}
        </div>

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
        {/* <div className="flex flex-wrap gap-2">
          {tabs.map((t) => {
            const href = `${base}/${t.slug}`;
            const isActive = pathname?.startsWith(href) || active === t.slug;
            return (
              <Link key={t.slug} href={href}>
                <Button variant={isActive ? "default" : "outline"} size="sm">
                  {t.label}
                </Button>
              </Link>
            );
          })}
        </div> */}
      </div>

      {/* <Card className="m-4 flex-1 overflow-auto"> */}
        {children}
      {/* </Card> */}
    </div>
  );
}
