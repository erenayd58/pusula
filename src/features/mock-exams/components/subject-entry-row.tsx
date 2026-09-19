"use client";

import * as React from "react";
import { NumberStepper } from "@/components/shared/number-stepper";
import { SubjectBadge } from "@/components/shared/subject-badge";
import { formatCount, formatNet } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { MockSubject } from "../types";

export type SubjectEntry = {
  correct: number;
  wrong: number;
  /** Elle girilmiş boş; null = otomatik (karar C4). */
  blankManual: number | null;
};

/**
 * Sihirbaz ders satırı: `SubjectBadge` + soru sayısı, Doğru / Yanlış `dense` adımlayıcıları yan
 * yana, Boş yalnızca metin ("Boş 2", otomatik = soru sayısı − D − Y; dokununca / Enter'la
 * düzenlenir) + canlı net. Telefonda iki satır (üst: ders · Boş · Net; alt: Doğru − 16 + Yanlış
 * − 2 +), ≥ sm tek satır. D + Y + B soru sayısını aşarsa satır hatası "Bu derste 20 soru var".
 * `compact` koç yüzeyinde (aynı düzen, flat adımlayıcı).
 */
export function SubjectEntryRow({
  subject,
  entry,
  blank,
  net,
  error,
  compact,
  onChange,
  firstInputRef,
}: {
  subject: MockSubject;
  entry: SubjectEntry;
  /** Etkin boş (elle ya da otomatik); otomatik hesaplanamıyorsa 0. */
  blank: number;
  net: number;
  error: string | null;
  compact: boolean;
  onChange: (next: SubjectEntry) => void;
  firstInputRef?: React.Ref<HTMLInputElement>;
}) {
  const max = subject.questionCount ?? 200;
  const base = `mock-${subject.subjectId}`;
  return (
    <li
      data-testid="subject-entry-row"
      className={cn(
        "flex flex-col gap-2 rounded-sm border border-line bg-bg-paper px-2.5 py-2.5 sm:px-3",
        "clay:rounded-card clay:border-0 clay:clay-sm clay:bg-bg-raised sm:clay:px-4 sm:clay:py-3",
        compact && "gap-1.5",
      )}
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <div className="order-1 flex min-w-0 items-center gap-2 sm:w-40 sm:shrink-0">
          <SubjectBadge color={subject.color} shortName={subject.shortName} />
          <span className="text-micro-lg whitespace-nowrap text-ink-500">
            {subject.questionCount === null
              ? "soru sayısı yok"
              : formatCount(subject.questionCount, "soru")}
          </span>
        </div>
        {/* Telefonda Boş ve Net üst satırın sağında; ≥ sm adımlayıcılardan sonra. */}
        <div className="order-2 ml-auto flex items-center sm:order-3 sm:ml-0">
          <BlankField
            id={`${base}-blank`}
            value={blank}
            manual={entry.blankManual !== null}
            max={max}
            compact={compact}
            onChange={(v) => onChange({ ...entry, blankManual: v })}
          />
        </div>
        <div className="order-3 flex basis-full items-center justify-between gap-2 sm:order-2 sm:basis-auto sm:justify-start sm:gap-4">
          <NumberStepper
            id={`${base}-correct`}
            label="Doğru"
            value={entry.correct}
            onChange={(v) => onChange({ ...entry, correct: v })}
            max={max}
            dense
            inputRef={firstInputRef}
          />
          <NumberStepper
            id={`${base}-wrong`}
            label="Yanlış"
            value={entry.wrong}
            onChange={(v) => onChange({ ...entry, wrong: v })}
            max={max}
            dense
          />
        </div>
        <span className="order-2 text-small font-semibold whitespace-nowrap text-ink-900 tabular-nums sm:order-4 sm:ml-auto">
          {`Net ${formatNet(net)}`}
        </span>
      </div>
      {error ? (
        <p role="alert" className="text-small font-medium text-ink-900">
          {error}
        </p>
      ) : null}
    </li>
  );
}

/**
 * Boş alanı: metin düğmesi "Boş 2" (otomatik ya da elle); dokunma / Enter / Space düzenlemeyi açar,
 * girdi odaklı gelir, blur / Enter / Esc kapatır (Esc sihirbazı kapatmaz). Tab sırasında düğme olarak
 * yer alır; ↑ ↓ girdi açıkken sayıyı değiştirir. Değer [0, max] aralığında tam sayı.
 */
function BlankField({
  id,
  value,
  manual,
  max,
  compact,
  onChange,
}: {
  id: string;
  value: number;
  manual: boolean;
  max: number;
  compact: boolean;
  onChange: (value: number) => void;
}) {
  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState("");
  const buttonRef = React.useRef<HTMLButtonElement>(null);
  const restoreFocus = React.useRef(false);

  React.useEffect(() => {
    if (!editing && restoreFocus.current) {
      restoreFocus.current = false;
      buttonRef.current?.focus();
    }
  }, [editing]);

  function open() {
    setDraft(String(value));
    setEditing(true);
  }
  function close(refocus: boolean) {
    restoreFocus.current = refocus;
    setEditing(false);
  }
  function type(text: string) {
    const digits = text.replace(/[^0-9]/g, "");
    setDraft(digits);
    const parsed = Number.parseInt(digits, 10);
    onChange(Number.isFinite(parsed) ? Math.min(max, parsed) : 0);
  }
  function nudge(delta: number) {
    const next = Math.min(max, Math.max(0, value + delta));
    setDraft(String(next));
    onChange(next);
  }

  if (!editing) {
    return (
      <button
        ref={buttonRef}
        type="button"
        onClick={open}
        title={manual ? "Boş elle girildi; düzenle" : "Boş otomatik hesaplandı; düzenle"}
        className={cn(
          "-my-1.5 inline-flex min-h-11 items-center rounded-xs px-2 text-small whitespace-nowrap text-ink-700 tabular-nums",
          "underline decoration-ink-300 decoration-dotted underline-offset-4 hover:text-ink-900",
          compact && "min-h-9 pointer-coarse:min-h-11",
        )}
      >
        {`Boş ${formatCount(value)}`}
      </button>
    );
  }
  return (
    <label className="flex items-center gap-1.5 text-small font-medium whitespace-nowrap text-ink-700">
      Boş
      <input
        id={id}
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        autoComplete="off"
        autoFocus
        value={draft}
        onChange={(e) => type(e.target.value)}
        onFocus={(e) => e.currentTarget.select()}
        onBlur={() => close(false)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === "Escape") {
            e.preventDefault();
            e.stopPropagation();
            close(true);
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            nudge(1);
          } else if (e.key === "ArrowDown") {
            e.preventDefault();
            nudge(-1);
          }
        }}
        className={cn(
          "h-9 w-11 rounded-xs border border-line-strong bg-bg-paper px-1 text-center font-semibold text-ink-900 tabular-nums",
          "clay:rounded-md clay:border-0 clay:clay-well",
          compact ? "h-8" : "sm:h-10",
        )}
      />
    </label>
  );
}
