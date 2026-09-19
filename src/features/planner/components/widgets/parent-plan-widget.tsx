import { ProgressBar } from "@/components/shared/progress-bar";
import { getStudentHeader } from "@/features/core";
import { toDateKey, todayInIstanbul, weekStart } from "@/lib/dates";
import { formatCount, formatPossessive } from "@/lib/format";
import type { ParentSummaryWidgetProps } from "@/modules/define-module";
import { getPlanCompletion } from "../../server/queries";

/** Sayı iyeliğinin belirtme hâli: `80'i` → `80'ini`. */
function accusative(value: number): string {
  const p = formatPossessive(value);
  return `${p}n${p.at(-1) ?? "i"}`;
}

/**
 * Veli Özet kartı (V1 en üst; 12 §2 Adım 6, order 10): "Ayşe bu hafta planının %80'ini tamamladı."
 * + ince çubuk (`ink-900`; V1'deki yeşil 04 §4.2 gereği yok). Yalnızca yayınlanmış plan; geçmiş
 * haftada hafta geneli, bu haftada "bugüne kadar" yüzdesi. Plan yoksa nötr cümle.
 */
export async function ParentPlanWidget({ studentId, weekStart: week }: ParentSummaryWidgetProps) {
  const [completion, student] = await Promise.all([
    getPlanCompletion(studentId, week),
    getStudentHeader(studentId),
  ]);
  const name = student?.fullName.split(" ")[0] ?? "Çocuğunuz";
  const isCurrent = week === toDateKey(weekStart(todayInIstanbul()));
  const published = completion?.status === "published" ? completion : null;

  let sentence: string;
  let percent: number | null = null;
  if (!published || published.itemsTotal === 0) {
    sentence = isCurrent
      ? "Bu hafta yayınlanmış plan yok."
      : "Bu hafta için yayınlanmış plan yoktu.";
  } else if (isCurrent) {
    percent = published.toDatePercent ?? published.percent;
    sentence =
      published.toDateTotal === 0
        ? `${name} bu hafta ${formatCount(published.itemsTotal, "görevlik")} planla başlıyor.`
        : `${name} bu hafta bugüne kadarki görevlerin %${accusative(percent ?? 0)} tamamladı.`;
  } else {
    percent = published.percent;
    sentence = `${name} bu hafta planının %${accusative(percent ?? 0)} tamamladı.`;
  }

  return (
    <section
      aria-label="Plan uyumu"
      data-testid="parent-plan"
      className="flex flex-col gap-3 rounded-card clay-sm bg-bg-raised p-4"
    >
      <p className="text-body text-ink-900">{sentence}</p>
      {percent !== null ? (
        <>
          <ProgressBar percent={percent} label="Plan uyumu" />
          <p className="text-small text-ink-500">
            {`${formatCount(published?.itemsTotal ?? 0, "görevin")} ${formatPossessive(published?.itemsCompleted ?? 0)} tamamlandı`}
          </p>
        </>
      ) : null}
    </section>
  );
}
