import { StatTile } from "@/components/shared/stat-tile";
import { formatCount, formatDateTr, formatPercent } from "@/lib/format";
import { getCoachOverview } from "../server/queries";

/**
 * K2 Genel bakış (flat): bugün soru, bu hafta soru, hedef durumu; son 14 günün günlük soru
 * sayısı basit çubuklarla (grafik kütüphanesi yok). Ders dışı metrik: ink-900.
 */
export async function CoachOverview({
  studentId,
  goals,
}: {
  studentId: string;
  goals: { daily: number | null; weekly: number | null };
}) {
  const { todayQuestions, weekQuestions, last14 } = await getCoachOverview(studentId);
  const max = Math.max(1, ...last14.map((d) => d.questions));
  const total14 = last14.reduce((sum, d) => sum + d.questions, 0);
  const activeDays = last14.filter((d) => d.questions > 0).length;
  const dailyPct = goals.daily
    ? Math.min(100, Math.floor((todayQuestions / goals.daily) * 100))
    : null;
  const weeklyPct = goals.weekly
    ? Math.min(100, Math.floor((weekQuestions / goals.weekly) * 100))
    : null;

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <StatTile
          label="Bugün soru"
          value={formatCount(todayQuestions)}
          hint={
            goals.daily
              ? `günlük hedef ${formatCount(goals.daily)} · ${formatPercent(dailyPct ?? 0)}`
              : "günlük hedef yok"
          }
        />
        <StatTile
          label="Bu hafta soru"
          value={formatCount(weekQuestions)}
          hint={
            goals.weekly
              ? `haftalık hedef ${formatCount(goals.weekly)} · ${formatPercent(weeklyPct ?? 0)}`
              : "haftalık hedef yok"
          }
        />
        <StatTile
          label="Son 14 gün"
          value={formatCount(total14, "soru")}
          hint={`${formatCount(activeDays, "gün")} kayıt girildi`}
        />
      </div>

      <section
        aria-label="Son 14 gün günlük soru sayısı"
        className="overflow-hidden rounded-sm border border-line bg-bg-paper p-4"
      >
        <h3 className="mb-3 text-small font-medium text-ink-900">
          {`Son 14 gün · çözülen soru · ${formatDateTr(last14[0]!.day)} – ${formatDateTr(last14[13]!.day)}`}
        </h3>
        {/* Etiket yalnızca ayın günü (telefonda 14 sütun sığsın); tam tarih ekran okuyucuda. */}
        <ol className="flex h-32 items-end gap-1 sm:gap-1.5">
          {last14.map((d) => (
            <li
              key={d.day}
              className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1"
            >
              <span className="text-micro text-ink-500" aria-hidden="true">
                {d.questions > 0 ? d.questions : ""}
              </span>
              <span
                aria-hidden="true"
                className="w-full rounded-xs bg-ink-900"
                style={{
                  height: `${Math.max(d.questions > 0 ? 4 : 2, (d.questions / max) * 100)}%`,
                }}
              />
              <span className="text-micro text-ink-500" aria-hidden="true">
                {formatDateTr(d.day).split(/\s/)[0]}
              </span>
              <span className="sr-only">{`${formatDateTr(d.day)}: ${formatCount(d.questions, "soru")}`}</span>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
