import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * İnce ilerleme çubuğu (04 Bölüm 10, 12.1): genişlik ham sayıdan (`width: 86%`), ekran metni
 * ayrıca yazılır. Ders dışı metrik: dolgu ink-900; `reached` ile fosforlu sarı. Clay'de yuva "kuyu".
 * `marker` (Faz 5b): çubuk üzerinde ince çentik (ör. takvime göre beklenen, %); bilgi metinle de verilir.
 */
export function ProgressBar({
  percent,
  reached = false,
  marker,
  label,
  className,
  ...props
}: React.ComponentProps<"div"> & {
  percent: number;
  reached?: boolean;
  marker?: number;
  label: string;
}) {
  const clamped = Math.max(0, Math.min(100, percent));
  const markerAt = marker === undefined ? null : Math.max(0, Math.min(100, marker));
  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(clamped)}
      aria-label={label}
      className={cn(
        "relative h-1.5 w-full overflow-hidden rounded-pill bg-bg-sunken clay:h-2.5 clay:clay-well",
        className,
      )}
      {...props}
    >
      <div
        className={cn("h-full rounded-pill", reached ? "bg-marker" : "bg-ink-900")}
        style={{ width: `${clamped}%` }}
      />
      {markerAt !== null ? (
        <span
          aria-hidden="true"
          data-testid="progress-marker"
          className="absolute top-0 h-full w-0.5 -translate-x-1/2 bg-ink-500"
          style={{ left: `${markerAt}%` }}
        />
      ) : null}
    </div>
  );
}
