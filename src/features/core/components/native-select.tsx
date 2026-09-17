import * as React from "react";
import { cn } from "@/lib/utils";

/** Yerel <select>; Input ile aynı ölçü ve kenarlık. Seçenek sayısı az olan basit formlar için. */
export function NativeSelect({ className, ...props }: React.ComponentProps<"select">) {
  return (
    <select
      data-slot="select"
      className={cn(
        "flex min-h-[38px] w-full min-w-0 rounded-xs border border-line-strong bg-bg-paper px-3 text-small text-ink-900 pointer-coarse:min-h-11",
        "disabled:cursor-not-allowed disabled:bg-bg-surface disabled:text-ink-300",
        "aria-invalid:border-error",
        "clay:min-h-12 clay:rounded-md clay:border-0 clay:clay-well clay:px-4 clay:text-body",
        className,
      )}
      {...props}
    />
  );
}
