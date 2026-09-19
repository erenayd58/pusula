"use client";

import { SubjectBadge } from "@/components/shared/subject-badge";
import { subjectVars } from "@/components/shared/subject-scope";
import { formatCount } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { MockSubject } from "../types";

/**
 * Sihirbaz 3. adım: yalnızca `wrong > 0` derslerin ünite konuları çip (çoklu seçim, sayı yok).
 * Yanlış olan ders yoksa kısa not.
 */
export function TopicMarkStep({
  subjects,
  wrongBySubject,
  selected,
  onToggle,
}: {
  subjects: readonly MockSubject[];
  wrongBySubject: ReadonlyMap<string, number>;
  selected: ReadonlySet<string>;
  onToggle: (topicId: string) => void;
}) {
  const withWrong = subjects.filter((s) => (wrongBySubject.get(s.subjectId) ?? 0) > 0);
  if (withWrong.length === 0) {
    return (
      <p className="rounded-sm border border-line bg-bg-paper p-4 text-small text-ink-700 clay:rounded-card clay:border-0 clay:clay-sm clay:bg-bg-raised">
        Hiçbir derste yanlış yok; işaretlenecek konu yok. Kaydedebilirsin.
      </p>
    );
  }
  return (
    <div className="flex flex-col gap-4">
      {withWrong.map((s) => (
        <fieldset
          key={s.subjectId}
          className="flex flex-col gap-3 rounded-sm border border-line bg-bg-paper p-3 clay:rounded-card clay:border-0 clay:clay-sm clay:bg-bg-raised clay:p-4"
        >
          <legend className="sr-only">{`${s.name} konuları`}</legend>
          <div className="flex items-center gap-2">
            <SubjectBadge color={s.color} shortName={s.shortName} />
            <span className="text-small text-ink-500">
              {formatCount(wrongBySubject.get(s.subjectId) ?? 0, "yanlış")}
            </span>
          </div>
          {s.topics.length === 0 ? (
            <p className="text-small text-ink-500">Bu dersin konu listesi boş.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {s.topics.map((t) => {
                const on = selected.has(t.topicId);
                return (
                  <button
                    key={t.topicId}
                    type="button"
                    role="checkbox"
                    aria-checked={on}
                    onClick={() => onToggle(t.topicId)}
                    style={subjectVars(s.color)}
                    className={cn(
                      "min-h-11 rounded-xs border px-3 text-small font-medium",
                      on
                        ? "border-subject bg-subject-soft text-subject-ink"
                        : "border-line bg-bg-paper text-ink-700 hover:bg-bg-surface",
                      "clay:min-h-12 clay:clay-press clay:rounded-md clay:border-0 clay:px-4",
                      on
                        ? "clay:clay-pressed clay:bg-subject-soft"
                        : "clay:clay-sm clay:bg-bg-raised",
                    )}
                  >
                    {t.name}
                  </button>
                );
              })}
            </div>
          )}
        </fieldset>
      ))}
    </div>
  );
}
