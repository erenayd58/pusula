import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * İnce ilerleme çubuğu (04 Bölüm 10, 12.1): genişlik ham sayıdan (`width: 86%`), ekran metni
 * ayrıca yazılır. Ders dışı metrik: dolgu ink-900; `reached` ile fosforlu sarı. Clay'de yuva "kuyu".
 */
export function ProgressBar({
  percent,
  reached = false,
  label,
  className,
  ...props
}: React.ComponentProps<"div"> & { percent: number; reached?: boolean; label: string }) {
  const clamped = Math.max(0, Math.min(100, percent));
  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(clamped)}
      aria-label={label}
      className={cn(
        "h-1.5 w-full overflow-hidden rounded-pill bg-bg-sunken clay:h-2.5 clay:clay-well",
        className,
      )}
      {...props}
    >
      <div
        className={cn("h-full rounded-pill", reached ? "bg-marker" : "bg-ink-900")}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}
