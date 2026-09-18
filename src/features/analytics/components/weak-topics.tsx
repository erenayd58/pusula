import { SubjectBadge } from "@/components/shared/subject-badge";
import { topicAlertKindLabels } from "@/content/labels";
import { alertReason, groupAlerts } from "../lib/alerts";
import type { TopicAlert } from "../types";

/**
 * K2 Konular sekmesi (flat): "Zayıf konular" (bilgi eksiği, düşük başarı), "Okulun gerisinde"
 * (okul bitirdi, öğrenci bitirmedi; Faz 5a) ve "Bakım gerektirenler" (tekrar zamanı, unutma
 * riski, soğumuş) üç ayrı liste. Uyarı rengi yok; tür etiketi metinle verilir (bilgi yalnızca
 * renkle verilmez).
 */
export function WeakTopics({ alerts }: { alerts: TopicAlert[] }) {
  const g = groupAlerts(alerts);
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <AlertColumn
        heading="Zayıf konular"
        hint="Son dönemde düşük başarı"
        alerts={g.weak}
        emptyText="Son dönemde düşük başarılı konu yok."
      />
      <AlertColumn
        heading="Okulun gerisinde"
        hint="Okul bitirdi, öğrenci bitirmedi"
        alerts={g.behind}
        emptyText="Okul takvimine göre geride konu yok. Takvim doldurulmadıysa bu liste boş kalır (Şablonlar → Takvim)."
      />
      <AlertColumn
        heading="Bakım gerektirenler"
        hint="Tekrar zamanı, unutma riski, soğumuş konu"
        alerts={g.maintenance}
        emptyText="Bakım bekleyen konu yok."
      />
    </div>
  );
}

function AlertColumn({
  heading,
  hint,
  alerts,
  emptyText,
}: {
  heading: string;
  hint: string;
  alerts: TopicAlert[];
  emptyText: string;
}) {
  return (
    <section
      aria-label={heading}
      className="flex flex-col gap-3 rounded-sm border border-line bg-bg-paper p-4"
    >
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-heading font-semibold text-ink-900">{heading}</h2>
        <span className="text-micro-lg text-ink-500">{hint}</span>
      </div>
      {alerts.length === 0 ? (
        <p className="text-small text-ink-700">{emptyText}</p>
      ) : (
        <ul className="flex flex-col divide-y divide-line">
          {alerts.map((a) => (
            <li
              key={`${a.kind}:${a.topicId}`}
              className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2.5 first:pt-0 last:pb-0"
            >
              <SubjectBadge color={a.subject.color} shortName={a.subject.shortName} />
              <span className="text-small font-medium text-ink-900">{a.topicName}</span>
              <span className="text-small text-ink-700">{alertReason(a)}</span>
              <span className="text-micro-lg text-ink-500">{topicAlertKindLabels[a.kind]}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
