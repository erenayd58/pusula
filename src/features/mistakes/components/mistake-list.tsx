import Link from "next/link";
import { CheckIcon, ChevronDownIcon, ChevronRightIcon, CircleXIcon } from "lucide-react";
import { SubjectBadge } from "@/components/shared/subject-badge";
import { subjectVars } from "@/components/shared/subject-scope";
import { Badge } from "@/components/ui/badge";
import { mistakeReasonLabels, mistakeStatusLabels } from "@/content/labels";
import { formatDateTr } from "@/lib/format";
import { cn } from "@/lib/utils";
import { mistakeReasonValues } from "../schemas";
import type { Mistake, MistakeFilters, MistakeSubject } from "../types";
import { MistakeImageDialog } from "./mistake-image-dialog";
import { MistakeStatusButton } from "./mistake-status-button";

const CARD = cn(
  "rounded-sm border border-line bg-bg-paper",
  "clay:rounded-card clay:border-0 clay:clay-sm clay:bg-bg-raised",
);

/** Filtre çipleri URL parametresiyle (sunucu filtreler): `?subject=&status=&reason=`. */
function filterHref(basePath: string, filters: MistakeFilters, patch: MistakeFilters): string {
  const next = { ...filters, ...patch };
  const params = new URLSearchParams();
  if (next.subjectId) params.set("subject", next.subjectId);
  if (next.status) params.set("status", next.status);
  if (next.reason) params.set("reason", next.reason);
  const q = params.toString();
  return q ? `${basePath}?${q}` : basePath;
}

function Chip({
  href,
  on,
  children,
  style,
  subject,
}: {
  href: string;
  on: boolean;
  children: React.ReactNode;
  style?: React.CSSProperties;
  subject?: boolean;
}) {
  return (
    <Link
      href={href}
      aria-pressed={on}
      style={style}
      className={cn(
        "inline-flex min-h-9 items-center gap-2 rounded-xs border px-3 text-micro-lg font-medium whitespace-nowrap",
        "clay:min-h-11 clay:rounded-pill clay:border-0 clay:px-4 clay:text-small clay:font-semibold",
        on
          ? subject
            ? "border-subject bg-subject-soft text-subject-ink clay:clay-pressed"
            : "border-ink-900 bg-ink-900 text-bg-paper clay:clay-pressed"
          : "border-line bg-bg-paper text-ink-700 hover:bg-bg-surface clay:clay-sm clay:bg-bg-raised",
      )}
    >
      {children}
    </Link>
  );
}

/**
 * Yanlış defteri listesi (10 §2 Parça 2): filtre çipleri (ders, durum, neden; URL parametresi),
 * kart: küçük fotoğraf (yoksa ders ikonu + notun ilk satırı), `SubjectBadge`, konu, neden rozeti
 * (nötr), tarih, "Çözdüm". Çözülen kart fosforlu onay taşır (tamamlanan görev kuralı, 04 §5).
 * Öğrenci kartı detaya gider; koç listesi salt okunur (fotoğraf diyaloğu).
 */
export function MistakeList({
  mistakes,
  subjects,
  filters,
  basePath,
  audience,
  studentId,
}: {
  mistakes: Mistake[];
  subjects: Pick<MistakeSubject, "subjectId" | "shortName" | "color">[];
  filters: MistakeFilters;
  basePath: string;
  /** Koç ve veli salt okunur (fotoğraf diyaloğu); veli yalnızca `can_view_details` ile (Faz 8, E8). */
  audience: "student" | "coach" | "parent";
  studentId: string;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2" data-testid="mistake-filters">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Ders filtresi">
          <Chip
            href={filterHref(basePath, filters, { subjectId: undefined })}
            on={!filters.subjectId}
          >
            Tüm dersler
          </Chip>
          {subjects.map((s) => (
            <Chip
              key={s.subjectId}
              href={filterHref(basePath, filters, { subjectId: s.subjectId })}
              on={filters.subjectId === s.subjectId}
              style={subjectVars(s.color)}
              subject
            >
              <span aria-hidden="true" className="size-2 rounded-full bg-subject" />
              {s.shortName}
            </Chip>
          ))}
        </div>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Durum filtresi">
          <Chip href={filterHref(basePath, filters, { status: undefined })} on={!filters.status}>
            Hepsi
          </Chip>
          <Chip
            href={filterHref(basePath, filters, { status: "open" })}
            on={filters.status === "open"}
          >
            {mistakeStatusLabels.open}
          </Chip>
          <Chip
            href={filterHref(basePath, filters, { status: "solved" })}
            on={filters.status === "solved"}
          >
            {mistakeStatusLabels.solved}
          </Chip>
        </div>
        {/* Neden çipleri katlanır (telefonda 3 satır yer kaplamasın); seçili neden varsa açık gelir. */}
        <details open={filters.reason !== undefined} className="group">
          <summary className="inline-flex min-h-9 cursor-pointer list-none items-center gap-1 text-small font-medium text-ink-700 select-none clay:min-h-11">
            Nedene göre
            <ChevronDownIcon aria-hidden="true" className="size-4 group-open:rotate-180" />
          </summary>
          <div className="mt-2 flex flex-wrap gap-2" role="group" aria-label="Neden filtresi">
            {mistakeReasonValues.map((r) => (
              <Chip
                key={r}
                href={filterHref(basePath, filters, {
                  reason: filters.reason === r ? undefined : r,
                })}
                on={filters.reason === r}
              >
                {mistakeReasonLabels[r]}
              </Chip>
            ))}
          </div>
        </details>
      </div>

      {mistakes.length === 0 ? (
        <p className="text-small text-ink-500">Bu filtrede kayıt yok.</p>
      ) : (
        <ul className="flex flex-col gap-3" data-testid="mistake-list">
          {mistakes.map((m) => {
            const solved = m.status === "solved";
            const title = m.topicName ?? m.subjectName;
            const thumb = m.imageUrl ? (
              audience !== "student" ? (
                <MistakeImageDialog url={m.imageUrl} title={title} className="size-16" />
              ) : (
                <span className="block size-16 shrink-0 overflow-hidden rounded-xs border border-line bg-bg-sunken clay:rounded-md clay:border-0 clay:clay-well">
                  {/* eslint-disable-next-line @next/next/no-img-element -- imzalı kısa ömürlü URL */}
                  <img src={m.imageUrl} alt="" className="size-full object-cover" loading="lazy" />
                </span>
              )
            ) : (
              <span
                aria-hidden="true"
                style={subjectVars(m.subjectColor)}
                className="flex size-16 shrink-0 items-center justify-center rounded-xs bg-subject-soft text-subject-ink clay:rounded-md"
              >
                <CircleXIcon className="size-6" />
              </span>
            );
            const summary = (
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <div className="flex flex-wrap items-center gap-2">
                  <SubjectBadge color={m.subjectColor} shortName={m.subjectShortName} />
                  {m.topicName ? (
                    <span className="truncate text-small font-medium text-ink-900">
                      {m.topicName}
                    </span>
                  ) : null}
                </div>
                {!m.imageUrl && m.note ? (
                  <p className="line-clamp-2 text-small text-ink-700">{m.note}</p>
                ) : null}
              </div>
            );
            return (
              <li
                key={m.id}
                data-testid="mistake-card"
                data-status={m.status}
                className={cn(CARD, "flex flex-col gap-3 p-3 clay:p-4")}
              >
                {audience === "student" ? (
                  <Link
                    href={`${basePath}/${m.id}`}
                    className="flex min-w-0 items-center gap-3 rounded-sm"
                    aria-label={`${title} kaydını aç`}
                  >
                    {thumb}
                    {summary}
                    <ChevronRightIcon aria-hidden="true" className="size-5 shrink-0 text-ink-500" />
                  </Link>
                ) : (
                  <div className="flex min-w-0 items-center gap-3">
                    {thumb}
                    {summary}
                  </div>
                )}
                <div className="flex flex-wrap items-center gap-2 text-micro-lg text-ink-500">
                  <Badge>{mistakeReasonLabels[m.reason]}</Badge>
                  <span>{formatDateTr(m.createdAt)}</span>
                  {solved ? (
                    <span className="inline-flex items-center gap-1 rounded-pill bg-marker px-2 py-0.5 font-semibold text-ink-900">
                      <CheckIcon aria-hidden="true" className="size-3.5" />
                      {mistakeStatusLabels.solved}
                    </span>
                  ) : null}
                  {audience === "student" ? (
                    <span className="ml-auto">
                      <MistakeStatusButton
                        mistakeId={m.id}
                        studentId={studentId}
                        solved={solved}
                        compact
                      />
                    </span>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
