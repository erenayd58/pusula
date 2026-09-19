import Link from "next/link";
import { CircleCheckIcon, TriangleAlertIcon } from "lucide-react";
import { studentAlertKindLabels } from "@/content/labels";
import { formatCount } from "@/lib/format";
import { studentAlertAction, studentAlertReason } from "../lib/student-alerts";
import type { StudentAlert } from "../types";

/**
 * Öğrenci düzeyi uyarılar (Faz 8, 01 §7; 04 §8.4 K1): uyarı rengi kenar + ikon (yalnızca koç),
 * öğrenci adı (K1), tür, sebep; sağda türe göre hızlı eylem ("Not yaz", "Planı gözden geçir",
 * "Tekrar planı kur", "Hedefi aç"). K2'de `studentNames` verilmez, `emptyText` ile boş satır çizilir.
 */
export function StudentAlertList({
  alerts,
  studentNames,
  title = "Öğrenci uyarıları",
  description,
  emptyText,
  headingLevel = 2,
}: {
  alerts: StudentAlert[];
  studentNames?: ReadonlyMap<string, string>;
  title?: string;
  description?: string;
  /** Boşken gösterilecek metin; verilmezse bölüm hiç çizilmez. */
  emptyText?: string;
  headingLevel?: 2 | 3;
}) {
  if (alerts.length === 0 && !emptyText) return null;
  const Heading = headingLevel === 2 ? "h2" : "h3";

  return (
    <section aria-labelledby="student-alerts-heading" className="flex flex-col gap-3">
      <div className="flex items-center gap-2.5">
        <Heading id="student-alerts-heading" className="text-heading font-semibold text-ink-900">
          {title}
        </Heading>
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
          {emptyText}
        </p>
      ) : (
        <ul className="flex flex-col gap-2" aria-label="Öğrenci uyarıları">
          {alerts.map((a) => {
            const action = studentAlertAction(a);
            return (
              <li
                key={`${a.studentId}:${a.kind}`}
                data-testid="student-alert-row"
                data-kind={a.kind}
                className="flex flex-col gap-2 rounded-sm border border-l-[3px] border-line border-l-warning bg-bg-paper px-4 py-3 md:flex-row md:items-center md:gap-4"
              >
                <span className="flex items-center gap-3 md:w-44 md:shrink-0">
                  <TriangleAlertIcon
                    aria-hidden="true"
                    className="size-[18px] shrink-0 text-warning"
                  />
                  <span className="truncate text-small font-semibold text-ink-900">
                    {studentNames
                      ? (studentNames.get(a.studentId) ?? "Öğrenci")
                      : studentAlertKindLabels[a.kind]}
                  </span>
                </span>
                <span className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-1">
                  {studentNames ? (
                    <span className="text-small font-medium text-ink-900">
                      {studentAlertKindLabels[a.kind]}
                    </span>
                  ) : null}
                  <span className="text-small text-ink-700">{studentAlertReason(a)}</span>
                </span>
                <Link
                  href={action.href}
                  className="inline-flex h-8 shrink-0 items-center rounded-xs px-2.5 text-small font-medium text-ink-900 underline-offset-4 hover:underline"
                >
                  {action.label}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
