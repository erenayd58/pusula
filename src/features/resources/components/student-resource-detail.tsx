"use client";

import { useContext } from "react";
import { CheckIcon, PlusIcon } from "lucide-react";
import { ProgressBar } from "@/components/shared/progress-bar";
import { QuickLogContext } from "@/components/shared/quick-log-context";
import { SubjectBadge } from "@/components/shared/subject-badge";
import { Badge } from "@/components/ui/badge";
import { resourceTypeLabels } from "@/content/labels";
import { formatCount, formatDateTr, formatPercent } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { SectionRow, StudentResourceRow } from "../types";

/**
 * Kitap detayı (öğrenci, clay): başlık + ilerleme; test satırları — bitenler onay ikonu + tarih,
 * bitmemişler dokununca hızlı kayıt `section` ön dolgusuyla açılır (açık plan görevi varsa
 * `planItem` da geçer → tek RPC). Çok dersli kitapta satırda ders rozeti. Aynı bileşen koç K2'de
 * salt okunur (`readOnly`; koç kabuğunda hızlı kayıt sağlayıcısı da yoktur, context null).
 */
export function StudentResourceDetail({
  resource,
  sections,
  readOnly = false,
}: {
  resource: StudentResourceRow;
  sections: SectionRow[];
  readOnly?: boolean;
}) {
  const quickLog = useContext(QuickLogContext);
  const interactive = !readOnly && quickLog !== null;
  const multiSubject = resource.subjectId === null;

  function logSection(s: SectionRow) {
    quickLog?.open({
      section: {
        id: s.sectionId,
        title: s.title,
        resourceTitle: resource.title,
        subjectId: s.subjectId,
        topicId: s.topicId,
        questionCount: s.questionCount,
      },
      planItem: s.openPlanItemId
        ? {
            id: s.openPlanItemId,
            title: `${resource.title} · ${s.title}`,
            subjectId: s.subjectId,
            topicId: s.topicId,
            targetValue: s.questionCount,
          }
        : undefined,
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2 rounded-sm border border-line bg-bg-paper p-4 clay:rounded-card clay:border-0 clay:clay-sm clay:bg-bg-raised">
        <div className="flex flex-wrap items-center gap-2 text-small text-ink-500">
          {resource.subjectColor && resource.subjectShortName ? (
            <SubjectBadge color={resource.subjectColor} shortName={resource.subjectShortName} />
          ) : (
            <Badge>Çok dersli</Badge>
          )}
          <span>{resourceTypeLabels[resource.type]}</span>
          {resource.publisher ? <span>· {resource.publisher}</span> : null}
        </div>
        <ProgressBar percent={resource.percent ?? 0} label={`${resource.title} ilerlemesi`} />
        <p className="text-small text-ink-700 tabular-nums" data-testid="resource-progress">
          {resource.sectionsTotal === 0
            ? "Henüz test yok"
            : `${formatPercent(resource.percent ?? 0)} · ${resource.sectionsDone} / ${formatCount(resource.sectionsTotal, "test")} bitti`}
        </p>
      </div>

      {sections.length === 0 ? (
        <p className="text-small text-ink-500">
          Bu kitapta henüz test yok.
          {resource.isOwn ? " “Düzenle” ile test ekleyebilirsin." : ""}
        </p>
      ) : (
        <ol
          className="flex flex-col divide-y divide-line rounded-sm border border-line bg-bg-paper clay:rounded-card clay:border-0 clay:clay-sm clay:bg-bg-raised"
          aria-label="Testler"
        >
          {sections.map((s) => {
            const done = s.doneAt !== null;
            const meta = [
              s.questionCount !== null ? formatCount(s.questionCount, "soru") : null,
              s.pageStart
                ? s.pageEnd && s.pageEnd !== s.pageStart
                  ? `s. ${s.pageStart}–${s.pageEnd}`
                  : `s. ${s.pageStart}`
                : null,
              s.topicName,
            ]
              .filter(Boolean)
              .join(" · ");
            const content = (
              <>
                <span
                  aria-hidden="true"
                  className={cn(
                    "flex size-7 shrink-0 items-center justify-center rounded-pill border",
                    done
                      ? "border-ink-900 bg-ink-900 text-bg-paper"
                      : "border-line-strong text-ink-500",
                  )}
                >
                  {done ? <CheckIcon className="size-4" /> : <PlusIcon className="size-4" />}
                </span>
                <span className="flex min-w-0 flex-1 flex-col text-left">
                  <span className={cn("text-body", done ? "text-ink-700" : "text-ink-900")}>
                    {s.title}
                  </span>
                  <span className="text-small text-ink-500">
                    {done && s.doneAt ? `Bitti · ${formatDateTr(s.doneAt)}` : meta || "—"}
                  </span>
                </span>
                {multiSubject && s.subjectColor && s.subjectShortName ? (
                  <SubjectBadge color={s.subjectColor} shortName={s.subjectShortName} />
                ) : null}
              </>
            );
            return (
              <li key={s.sectionId} data-testid="section-item" data-done={done}>
                {!interactive ? (
                  <div className="flex min-h-11 items-center gap-3 px-4 py-2.5">{content}</div>
                ) : (
                  <button
                    type="button"
                    onClick={() => logSection(s)}
                    aria-label={done ? `${s.title} bitti; yeniden kaydet` : `${s.title} kaydet`}
                    className="flex min-h-12 w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-bg-surface clay:hover:bg-bg-surface"
                  >
                    {content}
                  </button>
                )}
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
