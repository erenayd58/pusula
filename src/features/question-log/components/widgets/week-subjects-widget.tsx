import { subjectVars } from "@/components/shared/subject-scope";
import { formatCount, formatWeekRange } from "@/lib/format";
import { weekStart } from "@/lib/dates";
import type { ModuleWidgetProps } from "@/modules/define-module";
import { getWeekSubjectDistribution } from "../../server/queries";

/**
 * Bugün kartı (S5 "Bu hafta"): ders başına basit çubuklar. Çubuk genişliği ham yüzde,
 * dolgu ders rengi, etiket `-ink` tonu; grafik kütüphanesi yok. Ekran okuyucu için liste metni.
 */
export async function WeekSubjectsWidget({ studentId }: ModuleWidgetProps) {
  const now = new Date();
  const bars = await getWeekSubjectDistribution(studentId, now);
  const total = bars.reduce((sum, b) => sum + b.questions, 0);
  const max = Math.max(1, ...bars.map((b) => b.questions));

  return (
    <section aria-label="Bu hafta" className="flex flex-col gap-3 rounded-card clay-md p-5">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-heading font-semibold text-ink-900">Bu hafta</h2>
        <p className="text-small text-ink-500">
          {formatWeekRange(weekStart(now))} · {formatCount(total, "soru")}
        </p>
      </div>
      {bars.length === 0 ? (
        <p className="text-body text-ink-700">
          Bu hafta henüz kayıt yok. İlk kaydınla ders dağılımı burada görünür.
        </p>
      ) : (
        <ul className="flex flex-col gap-2.5">
          {bars.map((b) => (
            <li key={b.subjectId} style={subjectVars(b.color)} className="flex items-center gap-3">
              <span className="w-16 shrink-0 truncate text-small font-medium text-subject-ink">
                {b.shortName}
              </span>
              <span
                aria-hidden="true"
                className="h-3 flex-1 overflow-hidden rounded-pill bg-bg-sunken clay:clay-well"
              >
                <span
                  className="block h-full rounded-pill bg-subject"
                  style={{ width: `${Math.round((b.questions / max) * 100)}%` }}
                />
              </span>
              <span className="w-14 shrink-0 text-right text-small text-ink-700">
                {b.questions}
              </span>
              <span className="sr-only">{`${b.name}: ${formatCount(b.questions, "soru")}`}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
