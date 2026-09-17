import Link from "next/link";
import { CompassIcon } from "lucide-react";
import type { ModuleWidgetProps } from "@/modules/define-module";
import { nudgeText, pickStudentNudge } from "../../lib/nudge";
import { getTopicAlerts } from "../../server/queries";

/**
 * Bugün kartı (S1, side): en fazla bir nötr öneri — yalnızca bakım türleri ve sıradaki konu
 * (karar A7). Uyarı rengi yok, suçlayıcı dil yok; konu haritasına götürür. Gösterilecek bir
 * şey yoksa kart çizilmez.
 */
export async function TopicNudgeWidget({ studentId }: ModuleWidgetProps) {
  const alert = pickStudentNudge(await getTopicAlerts(studentId));
  if (!alert) return null;
  const { title, body } = nudgeText(alert);

  return (
    <Link
      href="/student/topics"
      data-testid="topic-nudge"
      aria-label={`${title} ${body} Konu haritasını aç.`}
      className="flex clay-press items-center gap-4 rounded-card clay-md p-4"
    >
      <span
        aria-hidden="true"
        className="flex size-11 shrink-0 items-center justify-center rounded-md clay-well text-ink-700"
      >
        <CompassIcon className="size-5" />
      </span>
      <span className="flex flex-1 flex-col">
        <span className="text-body font-semibold text-ink-900">{title}</span>
        <span className="text-small text-ink-500">{body}</span>
      </span>
    </Link>
  );
}
