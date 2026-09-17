import * as React from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Boş durum (04 Bölüm 10, 12): başlık, tek cümle, isteğe bağlı eylem. Eylem önerir,
 * yargılamaz. Clay'de kart (clay-md), koç (flat) yüzeyinde 1 px kenarlıklı düz kutu.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
  ...props
}: React.ComponentProps<"section"> & {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <section
      data-slot="empty-state"
      className={cn(
        "flex flex-col items-start gap-3 rounded-sm border border-line bg-bg-paper p-6",
        "clay:rounded-card clay:border-0 clay:clay-md clay:p-6",
        className,
      )}
      {...props}
    >
      {Icon ? (
        <span
          aria-hidden="true"
          className="flex size-11 items-center justify-center rounded-md bg-bg-surface text-ink-700 clay:rounded-md clay:clay-well"
        >
          <Icon className="size-5" />
        </span>
      ) : null}
      <div className="flex flex-col gap-1">
        <h2 className="text-heading font-semibold text-ink-900">{title}</h2>
        {description ? <p className="max-w-prose text-body text-ink-700">{description}</p> : null}
      </div>
      {action ? <div className="pt-1">{action}</div> : null}
    </section>
  );
}
