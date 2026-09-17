import { GoalRing } from "@/components/shared/goal-ring";
import { formatCount, formatPercent } from "@/lib/format";
import type { ModuleWidgetProps } from "@/modules/define-module";
import { getGoalProgress } from "../../server/queries";

/**
 * Bugün kartı: günün hedefi halkası (S1/S5). Ders dışı metrik: ink-900; hedefe ulaşınca fosforlu
 * ve "hedef tamam". Kalan dili, yargı yok (04 §12). Hedef yoksa bugünkü sayı + yönlendirme.
 */
export async function GoalRingWidget({ studentId }: ModuleWidgetProps) {
  const { todayQuestions, weekQuestions, goals } = await getGoalProgress(studentId);
  const daily = goals.daily;
  const percent = daily ? Math.min(100, Math.floor((todayQuestions / daily) * 100)) : 0;
  const reached = daily !== null && todayQuestions >= daily;
  const remaining = daily ? Math.max(0, daily - todayQuestions) : null;

  const message = !daily
    ? "Koçun günlük hedef belirleyince halka burada dolar."
    : reached
      ? "Hedef tamam. Bugün için bu kadar yeter, istersen devam et."
      : todayQuestions === 0
        ? `${formatCount(daily, "soru")} hedefin var. İlk kaydını gir, halka dolmaya başlasın.`
        : `${formatCount(remaining ?? 0, "soru")} kaldı.`;

  return (
    <section
      aria-label="Günün hedefi"
      className="flex items-center gap-5 rounded-card clay-md p-5"
      data-reached={reached || undefined}
    >
      <GoalRing percent={daily ? percent : 0} reached={reached} size={120} stroke={12}>
        <span className="text-display leading-none font-semibold text-ink-900">
          {todayQuestions}
        </span>
        <span className="text-micro-lg text-ink-500">{daily ? `/ ${daily} soru` : "soru"}</span>
      </GoalRing>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <h2 className="text-heading font-semibold text-ink-900">
          {reached ? "Hedef tamam" : "Günün hedefi"}
        </h2>
        <p className="text-body text-ink-700">{message}</p>
        <p className="text-micro-lg text-ink-500">
          {goals.weekly
            ? `Bu hafta ${formatCount(weekQuestions, "soru")} · haftalık hedefin ${formatPercent(Math.min(100, Math.floor((weekQuestions / goals.weekly) * 100)))}`
            : `Bu hafta ${formatCount(weekQuestions, "soru")}`}
        </p>
      </div>
    </section>
  );
}
