import { subjectVars } from "@/components/shared/subject-scope";
import { formatCount } from "@/lib/format";
import type { ParentSummaryWidgetProps } from "@/modules/define-module";
import { getWeekSubjectDistribution } from "../../server/queries";

/**
 * Veli Özet kartı (V1 "Ders bazında haftalık soru"; order 50): ders başına çubuk — dolgu ders rengi
 * (dersi temsil eder), etiket `-ink` tonu, sayı ink. Kayıt yoksa kart çizilmez (soru kutusu zaten söyler).
 */
export async function ParentSubjectWeekWidget({ studentId, weekStart }: ParentSummaryWidgetProps) {
  const bars = await getWeekSubjectDistribution(studentId, weekStart);
  if (bars.length === 0) return null;
  const max = Math.max(1, ...bars.map((b) => b.questions));
  return (
    <section
      aria-labelledby="parent-subject-week-heading"
      data-testid="parent-subject-week"
      className="flex flex-col gap-3 rounded-card clay-sm bg-bg-raised p-4"
    >
      <h2 id="parent-subject-week-heading" className="text-heading font-semibold text-ink-900">
        Ders bazında haftalık soru
      </h2>
      <ul className="flex flex-col gap-2.5">
        {bars.map((b) => (
          <li key={b.subjectId} style={subjectVars(b.color)} className="flex items-center gap-3">
            <span className="w-16 shrink-0 truncate text-small font-medium text-subject-ink">
              {b.shortName}
            </span>
            <span aria-hidden="true" className="h-3 flex-1 overflow-hidden rounded-pill clay-well">
              <span
                className="block h-full rounded-pill bg-subject"
                style={{ width: `${Math.round((b.questions / max) * 100)}%` }}
              />
            </span>
            <span className="w-14 shrink-0 text-right text-small text-ink-700 tabular-nums">
              {b.questions}
            </span>
            <span className="sr-only">{`${b.name}: ${formatCount(b.questions, "soru")}`}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
