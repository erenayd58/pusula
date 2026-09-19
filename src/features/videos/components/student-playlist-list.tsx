import Link from "next/link";
import { ProgressBar } from "@/components/shared/progress-bar";
import { SubjectBadge } from "@/components/shared/subject-badge";
import { Badge } from "@/components/ui/badge";
import { formatCount, formatDuration, formatPercent } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { StudentPlaylistRow } from "../types";

/**
 * Öğrencinin video listesi kartları (clay): ders rozeti / "Karışık", ad, kanal, ilerleme çubuğu
 * (`ink-900`) + "%40 · 4 / 10 video · 1 sa 20 dk kaldı". Koç K2'de aynı bileşen flat.
 */
export function StudentPlaylistList({
  rows,
  basePath,
}: {
  rows: StudentPlaylistRow[];
  basePath?: string;
}) {
  return (
    <ul
      className="grid gap-3 sm:grid-cols-2"
      aria-label="Video listeleri"
      data-testid="playlist-list"
    >
      {rows.map((r) => {
        const body = (
          <>
            <div className="flex items-center gap-2">
              {r.subjectColor && r.subjectShortName ? (
                <SubjectBadge color={r.subjectColor} shortName={r.subjectShortName} />
              ) : (
                <Badge>Karışık</Badge>
              )}
              {r.isOwn ? <Badge>Sen ekledin</Badge> : null}
            </div>
            <span className="line-clamp-2 text-body font-semibold text-ink-900">{r.title}</span>
            {r.channelName ? (
              <span className="text-small text-ink-500">{r.channelName}</span>
            ) : null}
            <ProgressBar
              percent={r.percent ?? 0}
              label={`${r.title} ilerlemesi`}
              className="mt-1"
            />
            <span className="text-small text-ink-700 tabular-nums" data-testid="playlist-progress">
              {r.videosTotal === 0
                ? "Henüz video yok"
                : [
                    `${formatPercent(r.percent ?? 0)} · ${r.videosWatched} / ${formatCount(r.videosTotal, "video")}`,
                    r.minutesRemaining > 0 ? `${formatDuration(r.minutesRemaining)} kaldı` : null,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
            </span>
          </>
        );
        const className = cn(
          "flex h-full flex-col gap-1.5 rounded-sm border border-line bg-bg-paper p-4",
          "clay:rounded-card clay:border-0 clay:clay-md clay:bg-bg-raised",
          basePath && "clay:clay-press",
        );
        return (
          <li key={r.playlistId} data-testid="playlist-card">
            {basePath ? (
              <Link href={`${basePath}/${r.playlistId}`} className={className}>
                {body}
              </Link>
            ) : (
              <div className={className}>{body}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
