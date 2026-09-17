import Link from "next/link";
import { ChevronRightIcon } from "lucide-react";
import { SubjectBadge } from "@/components/shared/subject-badge";
import { formatCount, formatDuration } from "@/lib/format";
import type { ModuleWidgetProps } from "@/modules/define-module";
import { getTodayLogs } from "../../server/queries";

/**
 * Bugün kartı: bugünkü kayıtlar (en yeni önce) ve geçmişe bağlantı. Boş durum eylem önerir.
 * Ders rengi yalnızca rozet; sayılar düz metin.
 */
export async function TodayLogsWidget({ studentId }: ModuleWidgetProps) {
  const logs = await getTodayLogs(studentId);
  const total = logs.reduce((sum, l) => sum + l.total, 0);
  const minutes = logs.reduce((sum, l) => sum + (l.durationMinutes ?? 0), 0);

  return (
    <section aria-label="Bugünkü kayıtlar" className="flex flex-col gap-3 rounded-card clay-md p-5">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-heading font-semibold text-ink-900">Bugünkü kayıtlar</h2>
        <Link
          href="/student/logs"
          className="flex min-h-11 items-center gap-1 text-small font-medium text-ink-700 underline-offset-4 hover:underline"
        >
          Tümü
          <ChevronRightIcon aria-hidden="true" className="size-4" />
        </Link>
      </div>
      {logs.length === 0 ? (
        <p className="text-body text-ink-700">
          Bugün henüz kayıt yok. (+) ile ilk kaydını gir; ders ve konu sonraki seferde hazır gelir.
        </p>
      ) : (
        <>
          <p className="text-small text-ink-500">
            {formatCount(total, "soru")}
            {minutes > 0 ? ` · ${formatDuration(minutes)}` : ""}
          </p>
          <ul className="flex flex-col divide-y divide-line">
            {logs.map((l) => (
              <li key={l.id} className="flex items-center gap-3 py-2.5">
                <SubjectBadge color={l.subjectColor} shortName={l.subjectShortName} />
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-body text-ink-900">
                    {l.topicName ?? l.subjectName}
                  </span>
                  <span className="text-small text-ink-500">
                    {`${l.total} soru · ${l.correct} D / ${l.wrong} Y / ${l.blank} B`}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
