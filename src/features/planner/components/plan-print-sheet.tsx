import { dayOfWeekLabels } from "@/content/labels";
import { formatDateTr, formatDuration, formatWeekRange } from "@/lib/format";
import { taskMeta } from "../lib/task-title";
import type { PlanItem } from "../types";

/**
 * Yazdırılabilir haftalık plan (@media print): 7 gün + "bu hafta içinde", görev başına kutu,
 * meta ve tamamlanma işareti. Ekranda gizli (`hidden print:block`); öğrenci ve koç ekranında
 * aynı bileşen. Diğer her şey `data-print="hide"` / `print:hidden` ile gizlenir.
 */
export function PlanPrintSheet({
  studentName,
  weekStart,
  dates,
  items,
  coachMessage,
}: {
  studentName: string;
  weekStart: string;
  /** Gün → tarih (YYYY-MM-DD), pazartesi = 1. */
  dates: Record<number, string>;
  items: PlanItem[];
  coachMessage: string | null;
}) {
  const groups: { day: number | null; items: PlanItem[] }[] = [1, 2, 3, 4, 5, 6, 7, null].map(
    (day) => ({ day, items: items.filter((i) => i.dayOfWeek === day) }),
  );
  return (
    <section className="hidden print:block" aria-label="Yazdırılabilir plan">
      <h1 className="text-title font-semibold">{`${studentName} · haftalık plan`}</h1>
      <p className="text-small">{formatWeekRange(weekStart, { year: true })}</p>
      {coachMessage ? <p className="mt-2 text-small">{`Koç: “${coachMessage}”`}</p> : null}
      <div className="mt-4 grid grid-cols-2 gap-3">
        {groups.map(({ day, items: dayItems }) => (
          <div key={String(day)} className="break-inside-avoid rounded-xs border border-line p-2">
            <h2 className="text-small font-semibold">
              {day === null
                ? "Bu hafta içinde"
                : `${dayOfWeekLabels[day]} · ${formatDateTr(dates[day] ?? weekStart)}`}
              <span className="ml-2 font-normal text-ink-500">
                {formatDuration(dayItems.reduce((s, i) => s + i.estimatedMinutes, 0))}
              </span>
            </h2>
            {dayItems.length === 0 ? (
              <p className="text-micro-lg text-ink-500">—</p>
            ) : (
              <ul className="mt-1 flex flex-col gap-1">
                {dayItems.map((i) => (
                  <li key={i.id} className="flex items-start gap-2 text-small">
                    <span
                      aria-hidden="true"
                      className="mt-0.5 inline-block size-3.5 shrink-0 rounded-xs border border-ink-900"
                    >
                      {i.completedAt ? "✓" : ""}
                    </span>
                    <span>
                      <span className="font-medium">{i.title}</span>
                      <span className="text-ink-500">
                        {" · "}
                        {taskMeta({
                          subjectName: i.subjectShortName,
                          targetValue: i.targetValue,
                          targetUnit: i.targetUnit,
                          estimatedMinutes: i.estimatedMinutes,
                        })}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
