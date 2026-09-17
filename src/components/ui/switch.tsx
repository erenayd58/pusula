"use client";

import * as React from "react";
import { Switch as SwitchPrimitive } from "radix-ui";
import { cn } from "@/lib/utils";

/*
 * Aç/kapat anahtarı (koç: modül ayarları). Açık durumda ink-900, kapalıda line-strong;
 * durum yalnızca renkle değil, yanındaki etiket ve `aria-checked` ile de verilir.
 * Dokunma hedefi 44 px'e `p-2` kap ile tamamlanır (satır bileşeni sağlar).
 */
function Switch({ className, ...props }: React.ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        "peer inline-flex h-6 w-11 shrink-0 items-center rounded-pill border border-transparent transition-colors outline-none",
        "data-[state=checked]:bg-ink-900 data-[state=unchecked]:bg-line-strong",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "clay:h-7 clay:w-12",
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className={cn(
          "pointer-events-none block size-5 rounded-pill bg-bg-paper shadow-pop transition-transform",
          "data-[state=checked]:translate-x-5 data-[state=unchecked]:translate-x-0.5",
          "clay:size-6 clay:data-[state=checked]:translate-x-5.5",
        )}
      />
    </SwitchPrimitive.Root>
  );
}

export { Switch };
