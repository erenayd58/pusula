"use client";

import { PlusIcon } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

/**
 * Hızlı kayıt düğmesi (04 Bölüm 8.2): telefonda alt menüden 18 px taşan yuvarlak düğme,
 * masaüstünde rayın tepesinde koyu kare düğme. Hızlı kayıt paneli Faz 3'te; şimdilik bilgi verir.
 */
export function QuickLogButton({ variant }: { variant: "fab" | "rail" }) {
  return (
    <button
      type="button"
      aria-label="Soru kaydı ekle"
      onClick={() => toast("Hızlı kayıt yakında. Şimdilik koçun senin için kayıt tutuyor.")}
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
