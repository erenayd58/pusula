import Link from "next/link";
import { ChevronRightIcon } from "lucide-react";
import { formatCount, formatDuration } from "@/lib/format";
import type { ModuleWidgetProps } from "@/modules/define-module";
import { completedCount, dayMinutes } from "../../lib/plan-summary";
import { getTodayPlanItems } from "../../server/queries";
import { PlanTaskCard } from "../plan-task-card";

/**
 * Bugün kartı "Planım" (S1): bugünün görevleri, tamamlanan/toplam, "bu hafta içinde" sayısı;
 * yayınlanmış plan yoksa yönlendirme. Görev kartı tamamlama akışı plan sayfasıyla aynı.
 */
export async function PlanTodayWidget({ studentId }: ModuleWidgetProps) {
  const { today, anytime, hasPlan } = await getTodayPlanItems(studentId);
  const done = completedCount(today);

  return (
    <section aria-labelledby="plan-today-heading" className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-2">
        <h2 id="plan-today-heading" className="text-heading font-semibold text-ink-900">
          Planım
        </h2>
        {today.length > 0 ? (
          <span className="text-small text-ink-500 tabular-nums">
            {`${done} / ${today.length} tamamlandı · ${formatDuration(dayMinutes(today, today[0]?.dayOfWeek ?? null))}`}
          </span>
        ) : null}
      </div>
      {!hasPlan ? (
        <p className="rounded-card clay-md p-4 text-body text-ink-700">
          Bu hafta için yayınlanmış plan yok. Koçun hazırlayınca görevlerin burada görünecek.
        </p>
      ) : today.length === 0 ? (
        <p className="rounded-card clay-md p-4 text-body text-ink-700">
          Bugün için görev yok.
          {anytime.length > 0
            ? ` “Bu hafta içinde” listesinde ${formatCount(anytime.length, "görev")} var.`
            : " İyi dinlen."}
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {today.map((item) => (
            <PlanTaskCard key={item.id} item={item} canPostpone={false} />
          ))}
        </ul>
      )}
      <Link
        href="/student/plan"
        className="flex clay-press items-center gap-2 self-start rounded-md px-3 py-2 text-small font-medium text-ink-700 underline underline-offset-4"
      >
        Haftalık planı aç
        <ChevronRightIcon aria-hidden="true" className="size-4" />
      </Link>
    </section>
  );
}
