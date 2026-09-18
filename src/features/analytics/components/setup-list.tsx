import Link from "next/link";
import { CircleCheckIcon, WrenchIcon } from "lucide-react";
import { setupAlertKindLabels } from "@/content/labels";
import { formatCount } from "@/lib/format";
import type { SetupAlert, SetupAlertKind } from "../types";

/** Uyarı türü → koçun gideceği sayfa (öğrenci kimliğiyle) ve düğme metni. */
const SETUP_ACTION: Record<SetupAlertKind, { href: (studentId: string) => string; label: string }> =
  {
    no_schedule: { href: (id) => `/coach/students/${id}/schedule`, label: "Programı gir" },
    no_goal: { href: (id) => `/coach/students/${id}#goals`, label: "Hedef koy" },
    no_plan: { href: (id) => `/coach/students/${id}/plan`, label: "Planı aç" },
    no_logs: { href: (id) => `/coach/students/${id}`, label: "Öğrenciyi aç" },
  };

const HINT: Record<SetupAlertKind, string> = {
  no_schedule: "Müsait süre ve plan dağıtımı için okul/kurs saatleri gerekli.",
  no_goal: "Günlük ya da haftalık soru hedefi olmadan Bugün ekranında halka boş kalır.",
  no_plan: "Öğrenci bu hafta Bugün ekranında görev görmüyor.",
  no_logs: "Hesap açılalı bir süre geçti; öğrenci hızlı kaydı denemedi.",
};

/**
 * "Kurulum" bölümü (yalnızca koç; K1 gruplu, K2 tek öğrenci): yeni öğrencide eksik adımlar;
 * her satırın eylemi ilgili sayfaya götürür. Nötr renk (uyarı değil, yapılacak iş).
 */
export function SetupList({
  alerts,
  studentNames,
  title = "Kurulum",
  description,
  emptyText,
  headingLevel = 2,
}: {
  alerts: SetupAlert[];
  /** Verilirse öğrenciye göre gruplu (K1); verilmezse düz liste (K2). */
  studentNames?: ReadonlyMap<string, string>;
  title?: string;
  description?: string;
  /** Boşken gösterilecek metin; verilmezse bölüm hiç çizilmez. */
  emptyText?: string;
  headingLevel?: 2 | 3;
}) {
  if (alerts.length === 0 && !emptyText) return null;
  const Heading = headingLevel === 2 ? "h2" : "h3";
  const groups = studentNames ? groupByStudent(alerts) : [{ studentId: null, items: alerts }];

  return (
    <section aria-labelledby="setup-heading" className="flex flex-col gap-3">
      <div className="flex items-center gap-2.5">
        <Heading id="setup-heading" className="text-heading font-semibold text-ink-900">
          {title}
        </Heading>
        {alerts.length > 0 ? (
          <span
            className="inline-flex h-[22px] min-w-[22px] items-center justify-center rounded-pill bg-bg-surface px-2 text-micro-lg font-semibold text-ink-900 tabular-nums"
            aria-label={formatCount(alerts.length, "eksik")}
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
        <div className="flex flex-col gap-4">
          {groups.map((g) => (
            <div
              key={g.studentId ?? "all"}
              data-testid="setup-group"
              className="flex flex-col gap-2"
            >
              {g.studentId ? (
                <h3 className="text-small font-semibold text-ink-900">
                  {studentNames?.get(g.studentId) ?? "Öğrenci"}
                </h3>
              ) : null}
              <ul className="flex flex-col gap-2" aria-label="Kurulum eksikleri">
                {g.items.map((a) => {
                  const action = SETUP_ACTION[a.kind];
                  return (
                    <li
                      key={`${a.studentId}:${a.kind}`}
                      data-testid="setup-row"
                      className="flex flex-col gap-2 rounded-sm border border-line bg-bg-paper px-4 py-3 md:flex-row md:items-center md:gap-4"
                    >
                      <span className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-1">
                        <WrenchIcon
                          aria-hidden="true"
                          className="size-[18px] shrink-0 text-ink-500"
                        />
                        <span className="text-small font-medium text-ink-900">
                          {setupAlertKindLabels[a.kind]}
                        </span>
                        <span className="text-small text-ink-700">{HINT[a.kind]}</span>
                      </span>
                      <Link
                        href={action.href(a.studentId)}
                        className="inline-flex h-8 shrink-0 items-center rounded-xs px-2.5 text-small font-medium text-ink-900 underline-offset-4 hover:underline"
                      >
                        {action.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function groupByStudent(list: SetupAlert[]): { studentId: string; items: SetupAlert[] }[] {
  const map = new Map<string, SetupAlert[]>();
  for (const a of list)
    (map.get(a.studentId) ?? map.set(a.studentId, []).get(a.studentId))!.push(a);
  return [...map].map(([studentId, items]) => ({ studentId, items }));
}
