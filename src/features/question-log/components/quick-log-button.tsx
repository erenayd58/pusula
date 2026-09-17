"use client";

import { PlusIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useQuickLog } from "./quick-log-provider";

/**
 * Hızlı kayıt düğmesi (04 Bölüm 8.2): telefon/tablette alt menüden 18 px taşan koyu (+),
 * masaüstünde rayın en üstünde "Kayıt". Sheet'i `QuickLogProvider` açar.
 */
export function QuickLogButton({ variant }: { variant: "fab" | "rail" }) {
  const { open } = useQuickLog();
  return (
    <button
      type="button"
      aria-label="Soru kaydı ekle"
      onClick={() => open()}
      className={cn(
        "flex clay-press items-center justify-center bg-ink-900 text-bg-paper shadow-clay-lg hover:bg-ink-700",
        variant === "fab"
          ? "size-14 rounded-pill"
          : "h-14 w-full flex-col gap-0.5 rounded-md text-micro font-semibold",
      )}
    >
      <PlusIcon aria-hidden="true" className={variant === "fab" ? "size-7" : "size-5"} />
      {variant === "rail" ? <span>Kayıt</span> : null}
    </button>
  );
}
