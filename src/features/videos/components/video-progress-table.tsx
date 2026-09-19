import Link from "next/link";
import { ProgressBar } from "@/components/shared/progress-bar";
import { SubjectBadge } from "@/components/shared/subject-badge";
import { Badge } from "@/components/ui/badge";
import { formatCount, formatDateTr, formatPercent } from "@/lib/format";
import type { StudentPlaylistRow, StudentVideoRow } from "../types";
import { StudentPlaylistPlayer } from "./student-playlist-player";

/** K2 "Videolar" sekmesi (koç, flat): liste satırı yüzde + son izleme; `details` ile video listesi (salt okunur, notlar). */
export function VideoProgressTable({
  studentId,
  rows,
  videos,
}: {
  studentId: string;
  rows: StudentPlaylistRow[];
  videos: StudentVideoRow[];
}) {
  const byPlaylist = new Map<string, StudentVideoRow[]>();
  for (const v of videos) {
    const list = byPlaylist.get(v.playlistId) ?? [];
    list.push(v);
    byPlaylist.set(v.playlistId, list);
  }
  return (
    <ul
      className="flex flex-col gap-3"
      aria-label="Atanmış video listeleri"
      data-testid="video-progress-table"
    >
      {rows.map((r) => (
        <li key={r.playlistId} className="rounded-sm border border-line bg-bg-paper">
          <details>
            <summary className="flex cursor-pointer flex-col gap-2 p-4">
              <span className="flex flex-wrap items-center gap-2">
                {r.subjectColor && r.subjectShortName ? (
                  <SubjectBadge color={r.subjectColor} shortName={r.subjectShortName} />
                ) : (
                  <Badge>Karışık</Badge>
                )}
                <Link
                  href={`/coach/videos/${r.playlistId}`}
                  className="font-medium text-ink-900 underline-offset-4 hover:underline"
                >
                  {r.title}
                </Link>
                {r.isOwn ? <Badge>Öğrenci ekledi</Badge> : null}
                <span
                  className="ml-auto text-small text-ink-700 tabular-nums"
                  data-testid="playlist-progress"
                >
                  {r.videosTotal === 0
                    ? "Video yok"
                    : `${formatPercent(r.percent ?? 0)} · ${r.videosWatched} / ${formatCount(r.videosTotal, "video")}${r.lastWatchedAt ? ` · son ${formatDateTr(r.lastWatchedAt)}` : ""}`}
                </span>
              </span>
              <ProgressBar percent={r.percent ?? 0} label={`${r.title} ilerlemesi`} />
            </summary>
            <div className="border-t border-line p-4">
              <StudentPlaylistPlayer
                studentId={studentId}
                playlist={r}
                videos={byPlaylist.get(r.playlistId) ?? []}
                selectedVideoId={null}
                basePath={`/coach/videos/${r.playlistId}`}
                readOnly
              />
            </div>
          </details>
        </li>
      ))}
    </ul>
  );
}
