import Link from "next/link";
import { NotebookPenIcon } from "lucide-react";
import { SubjectBadge } from "@/components/shared/subject-badge";
import { Badge } from "@/components/ui/badge";
import { mockExamKindLabels } from "@/content/labels";
import {
  formatCount,
  formatDateTr,
  formatDuration,
  formatNet,
  formatPercent,
  formatSigned,
} from "@/lib/format";
import { cn } from "@/lib/utils";
import type { MockResultDetail } from "../types";
import { ResultActions } from "./result-actions";

const CARD = cn(
  "rounded-sm border border-line bg-bg-paper",
  "clay:rounded-card clay:border-0 clay:clay-sm clay:bg-bg-raised",
);
const NUM_HEAD = "px-2 py-2.5 text-right font-medium sm:px-3";
const NUM_CELL = "px-2 py-2.5 text-right text-ink-900 tabular-nums sm:px-3";

/**
 * Deneme detayı: başlık satırı (ad, tarih, tür rozeti), toplam net + değişim, ders tablosu
 * (D/Y/B/net/değişim), işaretli konular, isteğe bağlı süre / puan / yüzdelik / not, düzenle / sil.
 * Puan ve yüzdelik yalnızca burada gösterilir (grafiğe girmez); LGS puanı hesaplanmaz.
 * `notebookPath` (Parça 2): `mistakes` modülü açıkken işaretli konu satırına "Deftere ekle"
 * bağlantısı (`/student/mistakes/new?subjectId=&topicId=&mockResultId=`; yalnızca URL, modül importu
 * yok; yalnızca öğrenci yüzeyinde).
 */
export function ResultDetail({
  result,
  basePath,
  canEdit,
  notebookPath = null,
}: {
  result: MockResultDetail;
  basePath: string;
  canEdit: boolean;
  notebookPath?: string | null;
}) {
  const facts = [
    result.durationMinutes !== null ? `Süre ${formatDuration(result.durationMinutes)}` : null,
    result.score !== null ? `Puan ${formatNet(result.score)}` : null,
    result.percentile !== null ? `Yüzdelik ${formatPercent(result.percentile, 2)}` : null,
  ].filter((f): f is string => f !== null);

  return (
    <div className="flex flex-col gap-5" data-testid="result-detail">
      <section className={cn(CARD, "flex flex-col gap-2 px-4 py-4 clay:p-5")}>
        <div className="flex flex-wrap items-center gap-2 text-micro-lg text-ink-500">
          <span>{formatDateTr(result.takenOn, { year: true, weekday: true })}</span>
          <Badge>
            {result.branchSubject
              ? `${mockExamKindLabels.branch} · ${result.branchSubject.shortName}`
              : mockExamKindLabels.general}
          </Badge>
        </div>
        <div className="flex items-baseline gap-3">
          <span
            data-testid="result-total-net"
            className="text-display font-semibold text-ink-900 tabular-nums"
          >
            {formatNet(result.totalNet)}
          </span>
          <span className="text-small text-ink-700 tabular-nums">
            {result.isBranch
              ? "net"
              : result.delta === null
                ? "net · ilk deneme"
                : `net · önceki denemeye göre ${formatSigned(result.delta)}`}
          </span>
        </div>
        {facts.length > 0 ? (
          <p className="text-small text-ink-700 tabular-nums">{facts.join(" · ")}</p>
        ) : null}
        {result.note ? <p className="text-small text-ink-900">“{result.note}”</p> : null}
      </section>

      {/* Telefonda (358 px) sütunlar dar dolguyla sığar; taşarsa kart yatay kayar. */}
      <section className={cn(CARD, "overflow-x-auto")} aria-label="Ders netleri">
        <table className="w-full text-small">
          <thead className="text-left text-micro-lg text-ink-500">
            <tr className="border-b border-line">
              <th className="px-3 py-2.5 font-medium sm:px-4">Ders</th>
              <th className={NUM_HEAD}>D</th>
              <th className={NUM_HEAD}>Y</th>
              <th className={NUM_HEAD}>B</th>
              <th className={NUM_HEAD}>Net</th>
              <th className="px-3 py-2.5 text-right font-medium sm:px-4">Değişim</th>
            </tr>
          </thead>
          <tbody>
            {result.subjects.map((s) => (
              <tr key={s.subjectId} className="border-b border-line last:border-b-0">
                <td className="px-3 py-2.5 sm:px-4">
                  <SubjectBadge color={s.color} shortName={s.shortName} />
                </td>
                <td className={NUM_CELL}>{s.correct}</td>
                <td className={NUM_CELL}>{s.wrong}</td>
                <td className={NUM_CELL}>{s.blank}</td>
                <td className={cn(NUM_CELL, "font-semibold")}>{formatNet(s.net)}</td>
                <td className="px-3 py-2.5 text-right text-ink-700 tabular-nums sm:px-4">
                  {s.delta === null ? "—" : formatSigned(s.delta)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="flex flex-col gap-2" aria-labelledby="marked-topics-heading">
        <h2 id="marked-topics-heading" className="text-heading font-semibold text-ink-900">
          {`İşaretli konular · ${formatCount(result.topics.length)}`}
        </h2>
        {result.topics.length === 0 ? (
          <p className="text-small text-ink-500">Bu denemede işaretli konu yok.</p>
        ) : (
          <ul
            className={cn(CARD, "flex flex-col divide-y divide-line")}
            data-testid="marked-topics"
          >
            {result.topics.map((t) => {
              const s = result.subjects.find((x) => x.subjectId === t.subjectId);
              return (
                <li key={t.topicId} className="flex items-center gap-3 px-4 py-2.5">
                  {s ? <SubjectBadge color={s.color} shortName={s.shortName} /> : null}
                  <span className="min-w-0 flex-1 truncate text-small text-ink-900">{t.name}</span>
                  {notebookPath ? (
                    <Link
                      href={`${notebookPath}/new?subjectId=${t.subjectId}&topicId=${t.topicId}&mockResultId=${result.id}`}
                      className="inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-xs px-2 text-micro-lg font-medium text-ink-700 underline-offset-4 hover:underline clay:min-h-11 clay:text-small"
                      data-testid="notebook-link"
                    >
                      <NotebookPenIcon aria-hidden="true" className="size-4" />
                      Deftere ekle
                    </Link>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {canEdit ? (
        <ResultActions
          resultId={result.id}
          studentId={result.studentId}
          title={result.title}
          basePath={basePath}
        />
      ) : null}
    </div>
  );
}
