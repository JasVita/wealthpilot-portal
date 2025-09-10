// src/components/header-slot.tsx
"use client";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

export function HeaderLeftSlot({ children }: { children: React.ReactNode }) {
  const [el, setEl] = useState<HTMLElement | null>(null);
  useEffect(() => setEl(document.getElementById("header-left-slot")), []);
  return el ? createPortal(children, el) : null;
}
