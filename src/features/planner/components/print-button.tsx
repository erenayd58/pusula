"use client";

import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";

/** Yazdır: tarayıcının yazdırma penceresi; sayfa @media print ile yalnızca plan listesini basar. */
export function PrintButton({ children }: { children: ReactNode }) {
  return (
    <Button
      type="button"
      variant="secondary"
      size="icon"
      aria-label="Planı yazdır"
      onClick={() => window.print()}
    >
      {children}
    </Button>
  );
}
