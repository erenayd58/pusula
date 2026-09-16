import * as React from "react";
import { cn } from "@/lib/utils";

/*
 * Metin girişi: koç (flat) yüzeyinde 38 px, 1 px kenarlık, beyaz zemin; dokunmatikte 44 px.
 * Clay yüzeyinde kap clay değildir, alanın içi "kuyu"dur (clay-well), 48 px (04 Bölüm 5, 10).
 * Odak halkası globaldir (:focus-visible).
 */
function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "flex min-h-[38px] w-full min-w-0 rounded-xs border border-line-strong bg-bg-paper px-3 text-small text-ink-900 pointer-coarse:min-h-11",
        "placeholder:text-ink-300",
        "file:inline-flex file:border-0 file:bg-transparent file:text-small file:font-medium file:text-ink-900",
        "disabled:cursor-not-allowed disabled:bg-bg-surface disabled:text-ink-300",
        "aria-invalid:border-error",
        "clay:min-h-12 clay:rounded-md clay:border-0 clay:clay-well clay:px-4 clay:text-body",
        "clay:disabled:bg-bg-sunken clay:aria-invalid:shadow-[var(--clay-well),inset_0_0_0_2px_var(--state-error)]",
        className,
      )}
      {...props}
    />
  );
}

export { Input };
