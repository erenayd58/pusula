import type { ReactNode } from "react";
import { LightbulbIcon } from "lucide-react";
import { SubjectBadge } from "@/components/shared/subject-badge";
import { planItemKindLabels, topicAlertKindLabels } from "@/content/labels";
import { formatCount, formatDuration, formatPercent } from "@/lib/format";
import type { SeasonPeriod } from "@/lib/strategy/periods";
import type { Suggestion } from "../lib/suggestions";
import { DismissSuggestionButton } from "./dismiss-suggestion-button";

/**
 * Öneri listesi (K1 "Öneriler" ve K2 kartı; flat, nötr renk): `studentNames` verilirse öğrenciye
 * göre gruplu (öğrenci başlığı + öneriler), verilmezse düz liste. Satır: ders rozeti, konu/ders,
 * sebep, strateji notu (Faz 5c, ink-500), tür; sağda `action` yuvası (planner "Plana ekle") ve
 * "Şimdi değil". Sıra puana göre (`buildSuggestions`), puan gösterilmez. `period` verilirse başlık
 * altında dönem adı ve karışımı; dönem yoksa satır yok.
 */
export function SuggestionList({
  suggestions,
  studentNames,
  dismissDays,
  action,
  title = "Öneriler",
  emptyText = "Şu an yeni öneri yok.",
  headingLevel = 2,
  visiblePerGroup,
  description,
  period,
}: {
  suggestions: Suggestion[];
  studentNames?: ReadonlyMap<string, string>;
  dismissDays: number;
  /** Satır başına ek eylem (planner `AddSuggestionButton`). */
  action?: (suggestion: Suggestion) => ReactNode;
  title?: string;
  emptyText?: string;
  headingLevel?: 2 | 3;
  /** Grup (öğrenci) başına açık satır; kalanı "Tümünü gör" (details). Sunum sınırı, sorgu sınırı değil. */
  visiblePerGroup?: number;
  /** Başlık altında tek satır açıklama. */
  description?: string;
  /** Bugünü kapsayan sezon dönemi (`periodFor`); varsa "Dönem: … · karışım …" satırı. */
  period?: SeasonPeriod | null;
}) {
  const Heading = headingLevel === 2 ? "h2" : "h3";
  const groups = studentNames
    ? groupByStudent(suggestions)
    : [{ studentId: null, items: suggestions }];

  return (
    <section aria-labelledby="suggestions-heading" className="flex flex-col gap-3">
      <div className="flex items-center gap-2.5">
        <Heading id="suggestions-heading" className="text-heading font-semibold text-ink-900">
          {title}
        </Heading>
        {suggestions.length > 0 ? (
          <span
            className="inline-flex h-[22px] min-w-[22px] items-center justify-center rounded-pill bg-bg-surface px-2 text-micro-lg font-semibold text-ink-900 tabular-nums"
            aria-label={formatCount(suggestions.length, "öneri")}
          >
            {suggestions.length}
          </span>
        ) : null}
      </div>
      {description ? <p className="-mt-1 text-small text-ink-500">{description}</p> : null}
      {period ? (
        <p data-testid="suggestion-period" className="-mt-1 text-small text-ink-700">
          Dönem: {period.name} · karışım yeni {formatPercent(period.mix.new_topic)} / zayıf{" "}
          {formatPercent(period.mix.weak)} / bakım {formatPercent(period.mix.review)}
        </p>
      ) : null}

      {suggestions.length === 0 ? (
        <p className="flex items-center gap-2 rounded-sm border border-line bg-bg-paper px-4 py-3 text-small text-ink-700">
          <LightbulbIcon aria-hidden="true" className="size-4 shrink-0 text-ink-500" />
          {emptyText}
        </p>
      ) : (
        <div className="flex flex-col gap-4">
          {groups.map((g) => (
            <div
              key={g.studentId ?? "all"}
              data-testid="suggestion-group"
              className="flex flex-col gap-2"
            >
              {g.studentId ? (
                <h3 className="text-small font-semibold text-ink-900">
                  {studentNames?.get(g.studentId) ?? "Öğrenci"}
                </h3>
              ) : null}
              <ul className="flex flex-col gap-2" aria-label="Öneriler">
                {(visiblePerGroup ? g.items.slice(0, visiblePerGroup) : g.items).map((s) => (
                  <SuggestionRow
                    key={rowKey(s)}
                    suggestion={s}
                    action={action}
                    dismissDays={dismissDays}
                  />
                ))}
              </ul>
              {visiblePerGroup && g.items.length > visiblePerGroup ? (
                <details className="group">
                  <summary className="cursor-pointer list-none text-small font-medium text-ink-700 underline underline-offset-4">
                    <span className="group-open:hidden">
                      Tümünü gör ({formatCount(g.items.length - visiblePerGroup, "öneri")} daha)
                    </span>
                    <span className="hidden group-open:inline">Daha az göster</span>
                  </summary>
                  <ul className="mt-2 flex flex-col gap-2" aria-label="Diğer öneriler">
                    {g.items.slice(visiblePerGroup).map((s) => (
                      <SuggestionRow
                        key={rowKey(s)}
                        suggestion={s}
                        action={action}
                        dismissDays={dismissDays}
                      />
                    ))}
                  </ul>
                </details>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function SuggestionRow({
  suggestion: s,
  action,
  dismissDays,
}: {
  suggestion: Suggestion;
  action?: (suggestion: Suggestion) => ReactNode;
  dismissDays: number;
}) {
  return (
    <li
      data-testid="suggestion-row"
      className="flex flex-col gap-2 rounded-sm border border-line bg-bg-paper px-4 py-3 md:flex-row md:items-center md:gap-4"
    >
      <span className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-1">
        <LightbulbIcon aria-hidden="true" className="size-[18px] shrink-0 text-ink-500" />
        <SubjectBadge color={s.subjectColor} shortName={s.subjectShortName} />
        <span className="text-small font-medium text-ink-900">{s.topicName ?? s.subjectName}</span>
        <span className="text-small text-ink-700">{s.reason}</span>
        {s.strategyNote ? (
          <span data-testid="suggestion-strategy-note" className="text-small text-ink-500">
            {s.strategyNote}
          </span>
        ) : null}
        <span className="text-micro-lg text-ink-500">
          {topicAlertKindLabels[s.kind]} · {planItemKindLabels[s.task.kind]} ·{" "}
          {formatDuration(s.task.estimatedMinutes)}
        </span>
      </span>
      <span className="flex items-center gap-2 md:shrink-0">
        {action?.(s)}
        <DismissSuggestionButton
          studentId={s.studentId}
          subjectId={s.subjectId}
          topicId={s.topicId}
          kind={s.kind}
          label={s.task.title}
          dismissDays={dismissDays}
        />
      </span>
    </li>
  );
}

function rowKey(s: Suggestion) {
  return `${s.studentId}:${s.kind}:${s.subjectId}:${s.topicId ?? ""}`;
}

function groupByStudent(list: Suggestion[]): { studentId: string; items: Suggestion[] }[] {
  const map = new Map<string, Suggestion[]>();
  for (const s of list)
    (map.get(s.studentId) ?? map.set(s.studentId, []).get(s.studentId))!.push(s);
  return [...map].map(([studentId, items]) => ({ studentId, items }));
}
