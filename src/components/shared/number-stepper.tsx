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
    !compact && "clay:size-12",
  );
  const inputClass = cn(
    "min-w-0 rounded-xs border border-line-strong bg-bg-paper text-center font-semibold text-ink-900",
    compact
      ? "h-8 w-14 text-small pointer-coarse:h-11"
      : "h-11 w-full text-heading-lg md:w-16 pointer-coarse:h-12",
    "clay:rounded-md clay:border-0 clay:clay-well",
    !compact && "clay:h-12 clay:text-display md:clay:w-20",
  );

  const minus = (
    <button
      type="button"
      tabIndex={-1}
      aria-label={`${label} azalt`}
      onClick={() => nudge(-step)}
      disabled={value <= min}
      className={cn(buttonClass, !compact && "md:order-first")}
    >
      <MinusIcon aria-hidden="true" className="size-4" />
    </button>
  );
  const plus = (
    <button
      type="button"
      tabIndex={-1}
      aria-label={`${label} artır`}
      onClick={() => nudge(step)}
      disabled={value >= max}
      className={cn(buttonClass, !compact && "md:order-last")}
    >
      <PlusIcon aria-hidden="true" className="size-4" />
    </button>
  );
  const input = (
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
  );

  // Telefonda (S2) sayı üstte, −/+ altta; ≥ md (S6) tek satırda − sayı +. compact: hep tek satır.
  return (
    <div
      className={cn("flex flex-col gap-1.5", compact ? "items-stretch" : "items-center", className)}
      {...props}
    >
      <label htmlFor={id} className="text-small font-medium text-ink-700">
        {label}
      </label>
      {compact ? (
        <div className="flex items-center gap-1">
          {minus}
          {input}
          {plus}
        </div>
      ) : (
        <div className="flex w-full flex-col items-center gap-2 md:flex-row md:justify-center">
          {input}
          <div className="flex gap-2 md:contents">
            {minus}
            {plus}
          </div>
        </div>
      )}
    </div>
  );
}
