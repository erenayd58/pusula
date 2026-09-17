"use client";

import * as React from "react";
import { MinusIcon, PlusIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Sayı adımlayıcı (04 Bölüm 10): − / + düğmeli, alan doğrudan yazılabilir, ↑ ↓ destekli.
 * Clay'de değer alanı "kuyu", dokunma hedefi 48 px; koç (flat) için `compact`.
 * Değer her zaman [min, max] aralığında tam sayıdır; boş alan min'e döner.
 * −/+ düğmeleri Tab sırasında değildir (klavye akışı alanlar arasında ilerler, ↑ ↓ sayıyı değiştirir).
 */
export function NumberStepper({
  id,
  label,
  value,
  onChange,
  min = 0,
  max = 500,
  step = 1,
  compact = false,
  className,
  inputRef,
  ...props
}: Omit<React.ComponentProps<"div">, "onChange"> & {
  id: string;
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  compact?: boolean;
  inputRef?: React.Ref<HTMLInputElement>;
}) {
  // Yazarken ara metne (boş, "1") izin ver; değer her tuşta anında güncellenir (anlık özet için),
  // blur'da metin değere eşitlenir (boş → min, taşan → max).
  const [draft, setDraft] = React.useState<string | null>(null);
  const shown = draft ?? String(value);

  function clamp(n: number) {
    return Math.min(max, Math.max(min, Math.round(n)));
  }
  function type(text: string) {
    const digits = text.replace(/[^0-9]/g, "");
    setDraft(digits);
    const parsed = Number.parseInt(digits, 10);
    onChange(Number.isFinite(parsed) ? clamp(parsed) : min);
  }
  function commit() {
    setDraft(null);
  }
  function nudge(delta: number) {
    setDraft(null);
    onChange(clamp(value + delta));
  }

  const buttonClass = cn(
    "flex shrink-0 items-center justify-center rounded-xs border border-line-strong bg-bg-paper text-ink-900 select-none",
    "hover:bg-bg-surface disabled:cursor-not-allowed disabled:text-ink-300",
    compact ? "size-8 pointer-coarse:size-11" : "size-11 pointer-coarse:size-12",
    "clay:clay-press clay:rounded-md clay:border-0 clay:clay-sm",
  );
  // Genişlik en az 3 hane (ör. 120) kesilmeden: 64 px kutu, 24 px yazı; üç adımlayıcı
  // masaüstü diyaloğuna (max-w-xl) yan yana sığar.
  const inputClass = cn(
    "min-w-0 shrink-0 rounded-xs border border-line-strong bg-bg-paper px-1 text-center font-semibold text-ink-900 tabular-nums",
    compact
      ? "h-8 w-14 text-small pointer-coarse:h-11"
      : "h-11 w-16 text-heading-lg pointer-coarse:h-12",
    "clay:rounded-md clay:border-0 clay:clay-well",
    !compact && "clay:h-12 clay:text-title",
  );

  // Her zaman tek satır: − sayı +. Varsayılan: telefonda etiket solda, kontroller sağda
  // (üç adımlayıcı alt alta sığar); ≥ md etiket üstte, ortalı (S6). compact: etiket üstte, küçük.
  return (
    <div
      className={cn(
        "flex gap-1.5",
        compact
          ? "flex-col items-stretch"
          : "items-center justify-between gap-3 md:flex-col md:items-center md:justify-start md:gap-1.5",
        className,
      )}
      {...props}
    >
      <label htmlFor={id} className="text-small font-medium text-ink-700">
        {label}
      </label>
      <div className={cn("flex items-center", compact ? "gap-1" : "gap-2")}>
        <button
          type="button"
          tabIndex={-1}
          aria-label={`${label} azalt`}
          onClick={() => nudge(-step)}
          disabled={value <= min}
          className={buttonClass}
        >
          <MinusIcon aria-hidden="true" className="size-4" />
        </button>
        <input
          ref={inputRef}
          id={id}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete="off"
          value={shown}
          onChange={(e) => type(e.target.value)}
          onBlur={commit}
          onFocus={(e) => e.currentTarget.select()}
          onKeyDown={(e) => {
            if (e.key === "ArrowUp") {
              e.preventDefault();
              nudge(step);
            } else if (e.key === "ArrowDown") {
              e.preventDefault();
              nudge(-step);
            }
          }}
          className={inputClass}
        />
        <button
          type="button"
          tabIndex={-1}
          aria-label={`${label} artır`}
          onClick={() => nudge(step)}
          disabled={value >= max}
          className={buttonClass}
        >
          <PlusIcon aria-hidden="true" className="size-4" />
        </button>
      </div>
    </div>
  );
}
