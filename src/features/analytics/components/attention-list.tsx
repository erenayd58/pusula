import type { ReactNode } from "react";
import Link from "next/link";
import { CircleCheckIcon, TriangleAlertIcon } from "lucide-react";
import { SubjectBadge } from "@/components/shared/subject-badge";
import { topicAlertKindLabels } from "@/content/labels";
import { formatCount } from "@/lib/format";
import { alertReason } from "../lib/alerts";
import type { TopicAlert } from "../types";

const DEFAULT_VISIBLE = 6;

/**
 * K1 "Dikkat gerektirenler" (flat, 04 §4.1 uyarı rengi yalnızca koçta): öğrenci, ders/konu,
 * sebep, tür; sağda `action` yuvası (Parça 4 "Plana ekle") ve "Öğrenciyi aç". Sıradaki konu
 * (`not_started`) dikkat gerektirmez, sayfa onu vermez. İlk 6 satır açık, gerisi `details`.
 */
export function AttentionList({
  alerts,
  studentNames,
  action,
  visible = DEFAULT_VISIBLE,
  description,
}: {
  alerts: TopicAlert[];
  studentNames: ReadonlyMap<string, string>;
  /** Satır başına ek eylem (Parça 4 "Plana ekle"); Parça 3'te boş. */
  action?: (alert: TopicAlert) => ReactNode;
  visible?: number;
  /** Başlık altında tek satır açıklama. */
  description?: string;
}) {
  const head = alerts.slice(0, visible);
  const rest = alerts.slice(visible);

  return (
    <section aria-labelledby="attention-heading" className="flex flex-col gap-3">
      <div className="flex items-center gap-2.5">
        <h2 id="attention-heading" className="text-heading font-semibold text-ink-900">
          Dikkat gerektirenler
        </h2>
        {alerts.length > 0 ? (
          <span
            className="inline-flex h-[22px] min-w-[22px] items-center justify-center rounded-pill bg-warning-soft px-2 text-micro-lg font-semibold text-ink-900 tabular-nums"
            aria-label={formatCount(alerts.length, "uyarı")}
          >
            {alerts.length}
          </span>
        ) : null}
      </div>
      {description ? <p className="-mt-1 text-small text-ink-500">{description}</p> : null}

      {alerts.length === 0 ? (
        <p className="flex items-center gap-2 rounded-sm border border-line bg-bg-paper px-4 py-3 text-small text-ink-700">
          <CircleCheckIcon aria-hidden="true" className="size-4 shrink-0 text-success" />
          Şu an dikkat gerektiren konu yok.
        </p>
      ) : (
        <>
          <ul className="flex flex-col gap-2" aria-label="Dikkat gerektiren konular">
            {head.map((a) => (
              <AttentionRow key={rowKey(a)} alert={a} studentNames={studentNames} action={action} />
            ))}
          </ul>
          {rest.length > 0 ? (
            <details className="group">
              <summary className="cursor-pointer list-none text-small font-medium text-ink-700 underline underline-offset-4">
                <span className="group-open:hidden">
                  Diğer {formatCount(rest.length, "uyarı")}yı göster
                </span>
                <span className="hidden group-open:inline">Daha az göster</span>
              </summary>
              <ul className="mt-2 flex flex-col gap-2" aria-label="Diğer uyarılar">
                {rest.map((a) => (
                  <AttentionRow
                    key={rowKey(a)}
                    alert={a}
                    studentNames={studentNames}
                    action={action}
                  />
                ))}
              </ul>
            </details>
          ) : null}
        </>
      )}
    </section>
  );
}

function rowKey(a: TopicAlert) {
  return `${a.studentId}:${a.kind}:${a.subject.id}:${a.topicId ?? ""}`;
}

function AttentionRow({
  alert: a,
  studentNames,
  action,
}: {
  alert: TopicAlert;
  studentNames: ReadonlyMap<string, string>;
  action?: (alert: TopicAlert) => ReactNode;
}) {
  const name = studentNames.get(a.studentId) ?? "Öğrenci";
  return (
    <li
      data-testid="attention-row"
      className="flex flex-col gap-2 rounded-sm border border-l-[3px] border-line border-l-warning bg-bg-paper px-4 py-3 md:flex-row md:items-center md:gap-4"
    >
      <span className="flex items-center gap-3 md:w-44 md:shrink-0">
        <TriangleAlertIcon aria-hidden="true" className="size-[18px] shrink-0 text-warning" />
        <span className="truncate text-small font-semibold text-ink-900">{name}</span>
      </span>
      <span className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-1">
        <SubjectBadge color={a.subject.color} shortName={a.subject.shortName} />
        <span className="text-small text-ink-900">{a.topicName ?? a.subject.name}</span>
        <span className="text-small text-ink-700">{alertReason(a)}</span>
        <span className="text-micro-lg text-ink-500">{topicAlertKindLabels[a.kind]}</span>
      </span>
      <span className="flex items-center gap-2 md:shrink-0">
        {action?.(a)}
        <Link
          href={`/coach/students/${a.studentId}${a.topicId ? "/topics" : ""}`}
          className="inline-flex h-8 items-center rounded-xs px-2.5 text-small font-medium text-ink-900 underline-offset-4 hover:underline"
        >
          Öğrenciyi aç
        </Link>
      </span>
    </li>
  );
}
