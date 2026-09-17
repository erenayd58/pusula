import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * İstatistik kutusu (04 Bölüm 10): büyük sayı + kısa açıklama (+ isteğe bağlı karşılaştırma).
 * Koç (flat): 1 px kenarlıklı düz kutu; clay: küçük kuyu. Ders rengi kullanmaz.
 */
export function StatTile({
  label,
  value,
  hint,
  className,
  ...props
}: React.ComponentProps<"div"> & {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-0.5 rounded-sm border border-line bg-bg-paper px-4 py-3",
        "clay:rounded-md clay:border-0 clay:clay-well",
        className,
      )}
      {...props}
    >
      <span className="text-micro-lg text-ink-500">{label}</span>
      <span className="text-heading-lg font-semibold text-ink-900">{value}</span>
      {hint ? <span className="text-micro-lg text-ink-500">{hint}</span> : null}
    </div>
  );
}
