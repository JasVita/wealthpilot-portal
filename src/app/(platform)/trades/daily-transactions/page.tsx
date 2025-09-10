"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { UsersRound } from "lucide-react";
import { useClientStore } from "@/stores/clients-store";

export default function TradesIndex() {
  const router = useRouter();
  const { currClient } = useClientStore();

  // If we already know the selected client, go straight to their trades page
  useEffect(() => {
    if (currClient) {
      router.replace(`/trades/${currClient}/daily-transactions`);
    }
  }, [currClient, router]);

  // If no client yet, show a gentle prompt (same look/feel as your other pages)
  if (currClient) return null;

  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-4 p-6 text-center">
      <UsersRound className="h-10 w-10 text-muted-foreground" />
      <h3 className="text-lg font-semibold">No client selected</h3>
      <p className="max-w-md text-sm text-muted-foreground">
        Choose a client from the header to view their daily transactions.
      </p>
    </div>
  );
}
