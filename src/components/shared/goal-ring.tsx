import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Hedef halkası (04 Bölüm 10): ders dışı metrik, dolgu ink-900; hedefe ulaşınca fosforlu sarı.
 * Halka yalnızca görsel (aria-hidden); sayı ve etiket `children` ile metin olarak verilir.
 * `percent` ham sayı (0-100), ekran metnini çağıran biçimler.
 */
export function GoalRing({
  percent,
  size = 120,
  stroke = 12,
  reached = false,
  className,
  children,
  ...props
}: React.ComponentProps<"div"> & {
  percent: number;
  size?: number;
  stroke?: number;
  reached?: boolean;
}) {
  const clamped = Math.max(0, Math.min(100, percent));
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - clamped / 100);

  return (
    <div
      className={cn("relative shrink-0", className)}
      style={{ width: size, height: size }}
      {...props}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--bg-sunken)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={reached ? "var(--accent-marker)" : "var(--ink-900)"}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          className="transition-[stroke-dashoffset] duration-500 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        {children}
      </div>
    </div>
  );
}
