import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";
import { cn } from "@/lib/utils";

/*
 * Genel rozet (ders rozeti için `SubjectBadge` kullanılır).
 * Koç (flat): 26 px, köşe xs; clay: 36 px pill, clay-sm.
 * Metin her tonda ink-900'dür (AA kontrast); ton sadece zemin ve ikon rengini değiştirir,
 * bilgi tek başına renkle verilmez.
 *
 * - `warning` yalnızca koç ekranlarında kullanılır (04 Bölüm 4.1).
 * - `error` yalnızca sistem hatası içindir ve her zaman ikon + metinle gelir.
 */
const badgeVariants = cva(
  [
    "inline-flex h-[26px] w-fit shrink-0 items-center justify-center gap-1.5 whitespace-nowrap",
    "rounded-xs border px-2 text-micro-lg font-medium text-ink-900",
    "[&>svg]:pointer-events-none [&>svg]:size-3.5 [&>svg]:shrink-0",
    "clay:h-auto clay:min-h-9 clay:rounded-pill clay:border-0 clay:px-3.5 clay:text-small clay:font-semibold clay:[&>svg]:size-4",
  ],
  {
    variants: {
      tone: {
        neutral: "border-line bg-bg-surface clay:clay-sm",
        success: "border-success-soft bg-success-soft [&>svg]:text-success",
        warning: "border-warning-soft bg-warning-soft [&>svg]:text-warning",
        error: "border-error bg-error-soft [&>svg]:text-error",
      },
    },
    defaultVariants: {
      tone: "neutral",
    },
  },
);

function Badge({
  className,
  tone = "neutral",
  asChild = false,
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "span";

  return (
    <Comp
      data-slot="badge"
      data-tone={tone}
      className={cn(badgeVariants({ tone }), className)}
      {...props}
    />
  );
}

export { Badge, badgeVariants };
