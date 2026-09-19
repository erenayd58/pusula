import Link from "next/link";
import { CheckIcon, PencilIcon } from "lucide-react";
import { SubjectBadge } from "@/components/shared/subject-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { mistakeReasonLabels, mistakeStatusLabels } from "@/content/labels";
import { formatDateTr } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Mistake } from "../types";
import { MistakeDeleteButton, MistakeStatusButton } from "./mistake-status-button";

const CARD = cn(
  "rounded-sm border border-line bg-bg-paper",
  "clay:rounded-card clay:border-0 clay:clay-sm clay:bg-bg-raised",
);

/**
 * Öğrenci kayıt detayı: tam fotoğraf (60 dk imzalı URL), ders / konu / neden / tarih, not,
 * "Denemeye git" (yalnızca URL; modül importu yok), Çözdüm / Geri al, Düzenle, Sil.
 */
export function MistakeDetail({
  mistake,
  basePath,
  examsPath,
}: {
  mistake: Mistake;
  basePath: string;
  /** `mistakes` modülü açıkken deneme bağı için `/student/exams`; kapalıysa null. */
  examsPath: string | null;
}) {
  const solved = mistake.status === "solved";
  return (
    <div className="flex flex-col gap-5" data-testid="mistake-detail">
      {mistake.imageUrl ? (
        <figure className={cn(CARD, "overflow-hidden")}>
          {/* eslint-disable-next-line @next/next/no-img-element -- imzalı kısa ömürlü URL */}
          <img
            src={mistake.imageUrl}
            alt={`${mistake.topicName ?? mistake.subjectName} soru fotoğrafı`}
            className="block max-h-[70vh] w-full object-contain"
            data-testid="mistake-image"
          />
        </figure>
      ) : null}

      <section className={cn(CARD, "flex flex-col gap-3 p-4 clay:p-5")}>
        <div className="flex flex-wrap items-center gap-2">
          <SubjectBadge color={mistake.subjectColor} shortName={mistake.subjectShortName} />
          {mistake.topicName ? (
            <span className="text-body font-medium text-ink-900">{mistake.topicName}</span>
          ) : null}
          {solved ? (
            <span className="inline-flex items-center gap-1 rounded-pill bg-marker px-2 py-0.5 text-micro-lg font-semibold text-ink-900">
              <CheckIcon aria-hidden="true" className="size-3.5" />
              {mistakeStatusLabels.solved}
            </span>
          ) : null}
        </div>
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-small">
          <dt className="text-ink-500">Neden</dt>
          <dd>
            <Badge>{mistakeReasonLabels[mistake.reason]}</Badge>
          </dd>
          <dt className="text-ink-500">Eklendi</dt>
          <dd className="text-ink-900">{formatDateTr(mistake.createdAt, { year: true })}</dd>
          {mistake.solvedAt ? (
            <>
              <dt className="text-ink-500">Çözüldü</dt>
              <dd className="text-ink-900">{formatDateTr(mistake.solvedAt, { year: true })}</dd>
            </>
          ) : null}
        </dl>
        {mistake.note ? (
          <p className="text-body whitespace-pre-line text-ink-900" data-testid="mistake-note">
            {mistake.note}
          </p>
        ) : null}
        {mistake.mockResultId && examsPath ? (
          <Link
            href={`${examsPath}/${mistake.mockResultId}`}
            className="text-small font-medium text-ink-900 underline underline-offset-4"
          >
            Denemeye git
          </Link>
        ) : null}
      </section>

      <div className="flex flex-wrap gap-2">
        <MistakeStatusButton mistakeId={mistake.id} studentId={mistake.studentId} solved={solved} />
        <Button asChild variant="secondary">
          <Link href={`${basePath}/${mistake.id}?edit=1`}>
            <PencilIcon aria-hidden="true" />
            Düzenle
          </Link>
        </Button>
        <MistakeDeleteButton
          mistakeId={mistake.id}
          studentId={mistake.studentId}
          basePath={basePath}
        />
      </div>
    </div>
  );
}
