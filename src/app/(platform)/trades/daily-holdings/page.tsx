// src/app/(platform)/trades/daily-holdings/page.tsx
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useClientStore } from "@/stores/clients-store";

export default function HoldingsEntry() {
  const router = useRouter();
  const { currClient, order } = useClientStore();

  useEffect(() => {
    if (currClient) {
      router.replace(`/trades/${currClient}/daily-holdings`);
    } else if (order.length) {
      router.replace(`/trades/${order[0]}/daily-holdings`);
    } else {
      router.replace("/clients"); // pick a client first
    }
  }, [currClient, order, router]);

  return null;
}
