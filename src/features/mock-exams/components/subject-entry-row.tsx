"use client";

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
 * Sihirbaz ders satırı: `SubjectBadge` + Doğru / Yanlış adımlayıcıları + Boş (otomatik = soru
 * sayısı − D − Y, düzenlenebilir) + canlı net. D + Y + B soru sayısını aşarsa satır hatası
 * "Bu derste 20 soru var". `compact` koç yüzeyinde.
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
        "flex flex-col gap-3 rounded-sm border border-line bg-bg-paper p-3",
        "clay:rounded-card clay:border-0 clay:clay-sm clay:bg-bg-raised clay:p-4",
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <SubjectBadge color={subject.color} shortName={subject.shortName} />
          <span className="text-small text-ink-500">
            {subject.questionCount === null
              ? "soru sayısı yok"
              : formatCount(subject.questionCount, "soru")}
          </span>
        </div>
        <span className="text-small font-semibold text-ink-900 tabular-nums">
          {`Net ${formatNet(net)}`}
        </span>
      </div>
      <div className={cn("grid gap-2", compact ? "grid-cols-3" : "md:grid-cols-3 md:gap-3")}>
        <NumberStepper
          id={`${base}-correct`}
          label="Doğru"
          value={entry.correct}
          onChange={(v) => onChange({ ...entry, correct: v })}
          max={max}
          compact={compact}
          inputRef={firstInputRef}
        />
        <NumberStepper
          id={`${base}-wrong`}
          label="Yanlış"
          value={entry.wrong}
          onChange={(v) => onChange({ ...entry, wrong: v })}
          max={max}
          compact={compact}
        />
        <NumberStepper
          id={`${base}-blank`}
          label={entry.blankManual === null ? "Boş (otomatik)" : "Boş"}
          value={blank}
          onChange={(v) => onChange({ ...entry, blankManual: v })}
          max={max}
          compact={compact}
        />
      </div>
      {error ? (
        <p role="alert" className="text-small font-medium text-ink-900">
          {error}
        </p>
      ) : null}
    </li>
  );
}
