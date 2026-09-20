"use client";

import { FieldError } from "@/components/shared/field-error";
import { dayOfWeekLabels, dayOfWeekShortLabels } from "@/content/labels";
import { cn } from "@/lib/utils";

/** Hızlı seçim kümeleri (hafta pazartesi başlar; 1 = Pzt … 7 = Paz). */
export const WEEKDAYS = [1, 2, 3, 4, 5] as const;
export const WEEKEND = [6, 7] as const;
export const ALL_DAYS = [1, 2, 3, 4, 5, 6, 7] as const;

const PRESETS: { label: string; days: readonly number[] }[] = [
  { label: "Hafta içi", days: WEEKDAYS },
  { label: "Hafta sonu", days: WEEKEND },
  { label: "Her gün", days: ALL_DAYS },
];

export type DayChoice = number | null;

const CHIP =
  "flex min-h-[38px] cursor-pointer items-center rounded-xs border px-3 text-small font-medium pointer-coarse:min-h-11";
const CHIP_ON = "border-ink-900 bg-ink-900 text-bg-paper";
const CHIP_OFF = "border-line bg-bg-paper text-ink-700 hover:bg-bg-surface";

function sameSet(a: readonly DayChoice[], b: readonly DayChoice[]) {
  return a.length === b.length && b.every((d) => a.includes(d));
}

/**
 * Gün çipleri (koç formlarının ortak kısayolu): çoklu seçimde onay kutuları + "Hafta içi ·
 * Hafta sonu · Her gün" hızlı seçimi; `single` modunda radyo davranışı (tek gün, kısayol yok).
 * `withWeekOnly`: plan görevleri için "Bu hafta içinde" (`null`) seçeneği. Klavye: Tab çipler
 * arasında ilerler, Boşluk/Enter seçer; odak halkası çipin üstünde görünür.
 */
export function DayChips({
  value,
  onChange,
  label = "Günler",
  single = false,
  withWeekOnly = false,
  disabledDays = [],
  disabled = false,
  error,
}: {
  value: DayChoice[];
  onChange: (days: DayChoice[]) => void;
  /** Grup adı (erişilebilirlik ve e2e); tekil modda "Gün" önerilir. */
  label?: string;
  single?: boolean;
  withWeekOnly?: boolean;
  /** Seçilemeyen günler (ör. görevin zaten bulunduğu gün). */
  disabledDays?: readonly DayChoice[];
  disabled?: boolean;
  error?: string;
}) {
  const choices: DayChoice[] = withWeekOnly ? [...ALL_DAYS, null] : [...ALL_DAYS];
  const inputType = single ? "radio" : "checkbox";

  function toggle(day: DayChoice, checked: boolean) {
    if (single) {
      onChange([day]);
      return;
    }
    onChange(checked ? [...value, day] : value.filter((d) => d !== day));
  }

  function applyPreset(days: readonly number[]) {
    onChange(days.filter((d) => !disabledDays.includes(d)));
  }

  return (
    <fieldset className="flex flex-col gap-2" disabled={disabled}>
      <legend className="mb-1.5 text-micro-lg text-ink-500">{label}</legend>
      <div className="flex flex-wrap gap-2" role="group" aria-label={label}>
        {choices.map((d) => {
          const selected = value.includes(d);
          const off = disabledDays.includes(d);
          return (
            <label
              key={String(d)}
              className={cn(
                CHIP,
                selected ? CHIP_ON : CHIP_OFF,
                off && "cursor-not-allowed text-ink-300 hover:bg-bg-paper",
                "has-focus-visible:outline-2 has-focus-visible:outline-focus",
              )}
              title={d === null ? undefined : dayOfWeekLabels[d]}
            >
              <input
                type={inputType}
                name={single ? label : undefined}
                className="sr-only"
                checked={selected}
                disabled={off}
                onChange={(e) => toggle(d, e.target.checked)}
              />
              {d === null ? "Bu hafta içinde" : dayOfWeekShortLabels[d]}
            </label>
          );
        })}
      </div>
      {!single ? (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-small text-ink-500">
          <span>Hızlı seç:</span>
          {PRESETS.map((p) => {
            const active = sameSet(value, p.days);
            return (
              <button
                key={p.label}
                type="button"
                aria-pressed={active}
                onClick={() => applyPreset(p.days)}
                className={cn(
                  "min-h-[32px] rounded-xs px-1 font-medium underline-offset-2 hover:underline pointer-coarse:min-h-11",
                  "focus-visible:outline-2 focus-visible:outline-focus",
                  active ? "text-ink-900 underline" : "text-ink-700",
                )}
              >
                {p.label}
              </button>
            );
          })}
          {value.length > 0 ? (
            <button
              type="button"
              onClick={() => onChange([])}
              className="min-h-[32px] rounded-xs px-1 text-ink-500 underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-focus pointer-coarse:min-h-11"
            >
              Temizle
            </button>
          ) : null}
        </div>
      ) : null}
      <FieldError message={error} />
    </fieldset>
  );
}
