import { SubjectBadge } from "@/components/shared/subject-badge";
import { formatCount, formatDateTr } from "@/lib/format";
import { subjectPace, type PaceInput, type PaceTopic } from "@/lib/strategy/pace";
import type { StudentTargets } from "../types";

/**
 * K2 "Ders bazlı gidişat" (Faz 5b): ders · bitirilen / planlanan konu (bugüne kadar hedeflenen) ·
 * soru gerçekleşen / hedef · tahmini bitiş (`subjectPace.projectedFinishOn`; hız 0 → "—" ve ipucu).
 * Ders rengi yalnızca rozette; uyarı rengi yok. Sunucu bileşeni.
 */
export function SubjectPaceTable({ targets, pace }: { targets: StudentTargets; pace: PaceInput }) {
  const topics: PaceTopic[] = targets.topics.map((t) => ({
    topicId: t.topicId,
    subjectId: t.subjectId,
    done: t.done,
    completedAt: t.completedAt,
    targetOn: t.targetOn,
  }));
  const hasTargets = targets.topicsFinishBy !== null;

  return (
    <section
      aria-labelledby="subject-pace-heading"
      className="flex flex-col gap-3 rounded-sm border border-line bg-bg-paper p-4"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="subject-pace-heading" className="text-heading font-semibold text-ink-900">
          Ders bazlı gidişat
        </h2>
        <span className="text-micro-lg text-ink-500">
          {hasTargets
            ? `Hız: son ${formatCount(pace.windowDays, "gün")}de biten konulardan`
            : "Hedef kurulmadı; konu ve soru sayıları yine görünür"}
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-small" data-testid="subject-pace-table">
          <thead className="text-left text-micro-lg text-ink-500">
            <tr className="border-b border-line">
              <th className="py-2 pr-3 font-medium">Ders</th>
              <th className="px-3 py-2 text-right font-medium">Konu (bitti / planlanan)</th>
              <th className="px-3 py-2 text-right font-medium">Soru (gerçekleşen / hedef)</th>
              <th className="py-2 pl-3 font-medium">Tahmini bitiş</th>
            </tr>
          </thead>
          <tbody>
            {targets.subjects.map((s) => {
              const p = subjectPace(topics, s.subjectId, pace);
              const finish =
                p.total - p.done === 0
                  ? "Bitti"
                  : p.projectedFinishOn
                    ? formatDateTr(p.projectedFinishOn, { year: true })
                    : "—";
              return (
                <tr key={s.subjectId} className="border-b border-line last:border-b-0">
                  <td className="py-2 pr-3">
                    <span className="flex items-center gap-2">
                      <SubjectBadge color={s.color} shortName={s.shortName} />
                      <span className="text-ink-900">{s.name}</span>
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right text-ink-900 tabular-nums">
                    {`${p.done} / ${hasTargets ? p.expectedByToday : "—"}`}
                    <span className="block text-micro-lg text-ink-500">{`toplam ${p.total}`}</span>
                  </td>
                  <td className="px-3 py-2 text-right text-ink-900 tabular-nums">
                    {`${formatCount(s.questionsDone)} / ${s.questions === null ? "—" : formatCount(s.questions)}`}
                  </td>
                  <td className="py-2 pl-3 text-ink-900">
                    {finish}
                    {finish === "—" ? (
                      <span className="block text-micro-lg text-ink-500">
                        {`son ${formatCount(pace.windowDays, "gün")}de bu derste konu bitmedi`}
                      </span>
                    ) : null}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
