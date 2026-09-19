"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { CheckIcon, PlayIcon } from "lucide-react";
import { toast } from "sonner";
import { ProgressBar } from "@/components/shared/progress-bar";
import { SubjectBadge } from "@/components/shared/subject-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { formatCount, formatDateTr, formatDuration, formatPercent } from "@/lib/format";
import { cn } from "@/lib/utils";
import { markVideoWatched, setVideoNote } from "../server/actions";
import type { StudentPlaylistRow, StudentVideoRow } from "../types";

/**
 * Oynatıcı sayfası (öğrenci, clay): üstte `youtube-nocookie` iframe (16:9; seçili video `?v=`,
 * varsayılan ilk izlenmemiş), altında "İzledim" (aria-pressed; RPC yayınlanmış plandaki görevi de
 * tamamlar), not alanı, "Sonraki video"; video listesi satırları (izlenenler onay ikonu + tarih).
 * Fosforlu yok (tamamlanan görev kuralı plan kartında). Koç K2'de `readOnly` (izlenenler + notlar).
 */
export function StudentPlaylistPlayer({
  studentId,
  playlist,
  videos,
  selectedVideoId,
  basePath,
  readOnly = false,
}: {
  studentId: string;
  playlist: StudentPlaylistRow;
  videos: StudentVideoRow[];
  selectedVideoId: string | null;
  /** `/student/videos/{playlistId}` — satır bağlantıları `?v=` ile. */
  basePath: string;
  readOnly?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const current =
    videos.find((v) => v.videoId === selectedVideoId) ??
    videos.find((v) => v.watchedAt === null) ??
    videos[0] ??
    null;
  const [note, setNote] = useState(current?.note ?? "");
  const currentIndex = current ? videos.findIndex((v) => v.videoId === current.videoId) : -1;
  const next = currentIndex >= 0 ? (videos[currentIndex + 1] ?? null) : null;

  function toggleWatched(video: StudentVideoRow) {
    startTransition(async () => {
      const result = await markVideoWatched({
        videoId: video.videoId,
        studentId,
        watched: video.watchedAt === null,
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(
        result.data.watched
          ? result.data.completedItems > 0
            ? "İzlendi olarak işaretlendi; plan görevin de tamamlandı."
            : "İzlendi olarak işaretlendi."
          : "İşaret kaldırıldı.",
      );
      router.refresh();
    });
  }

  function saveNote(video: StudentVideoRow) {
    startTransition(async () => {
      const result = await setVideoNote({ videoId: video.videoId, studentId, note });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Not kaydedildi.");
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2 rounded-sm border border-line bg-bg-paper p-4 clay:rounded-card clay:border-0 clay:clay-sm clay:bg-bg-raised">
        <div className="flex flex-wrap items-center gap-2 text-small text-ink-500">
          {playlist.subjectColor && playlist.subjectShortName ? (
            <SubjectBadge color={playlist.subjectColor} shortName={playlist.subjectShortName} />
          ) : (
            <Badge>Karışık</Badge>
          )}
          {playlist.channelName ? <span>{playlist.channelName}</span> : null}
        </div>
        <ProgressBar percent={playlist.percent ?? 0} label={`${playlist.title} ilerlemesi`} />
        <p className="text-small text-ink-700 tabular-nums" data-testid="playlist-progress">
          {playlist.videosTotal === 0
            ? "Henüz video yok"
            : `${formatPercent(playlist.percent ?? 0)} · ${playlist.videosWatched} / ${formatCount(playlist.videosTotal, "video")} izlendi${playlist.minutesRemaining > 0 ? ` · ${formatDuration(playlist.minutesRemaining)} kaldı` : ""}`}
        </p>
      </div>

      {current && !readOnly ? (
        <section
          className="flex flex-col gap-3"
          aria-labelledby="player-heading"
          data-testid="video-player"
        >
          <h2 id="player-heading" className="text-heading font-semibold text-ink-900">
            {current.title}
          </h2>
          <div className="overflow-hidden rounded-sm border border-line bg-bg-sunken clay:rounded-card clay:border-0 clay:clay-sm">
            <iframe
              key={current.youtubeVideoId}
              src={`https://www.youtube-nocookie.com/embed/${current.youtubeVideoId}?rel=0&modestbranding=1`}
              title={current.title}
              loading="lazy"
              allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen"
              allowFullScreen
              className="aspect-video w-full"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant={current.watchedAt ? "secondary" : "primary"}
              aria-pressed={current.watchedAt !== null}
              disabled={pending}
              onClick={() => toggleWatched(current)}
            >
              <CheckIcon aria-hidden="true" />
              {current.watchedAt ? "İzledim (geri al)" : "İzledim"}
            </Button>
            {next ? (
              <Button variant="secondary" asChild>
                <Link href={`${basePath}?v=${next.videoId}`}>Sonraki video</Link>
              </Button>
            ) : null}
            <span className="text-small text-ink-500">
              {[
                current.durationSeconds ? formatDuration(current.durationSeconds / 60) : null,
                current.topicName,
              ]
                .filter(Boolean)
                .join(" · ")}
            </span>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="video-note">Not (isteğe bağlı)</Label>
            <textarea
              id="video-note"
              maxLength={300}
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Aklında kalsın istediğin bir şey…"
              className="w-full rounded-xs border border-line-strong bg-bg-paper px-3 py-2 text-body text-ink-900 clay:rounded-md clay:border-0 clay:clay-well clay:px-4"
            />
            <div>
              <Button
                type="button"
                variant="secondary"
                disabled={pending || note.trim() === (current.note ?? "")}
                onClick={() => saveNote(current)}
              >
                Notu kaydet
              </Button>
            </div>
          </div>
        </section>
      ) : null}

      {videos.length === 0 ? (
        <p className="text-small text-ink-500">
          Bu listede henüz video yok.{playlist.isOwn ? " “Düzenle” ile video ekleyebilirsin." : ""}
        </p>
      ) : (
        <ol
          className="flex flex-col divide-y divide-line rounded-sm border border-line bg-bg-paper clay:rounded-card clay:border-0 clay:clay-sm clay:bg-bg-raised"
          aria-label="Videolar"
        >
          {videos.map((v, index) => {
            const done = v.watchedAt !== null;
            const isCurrent = !readOnly && current?.videoId === v.videoId;
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
                  {done ? <CheckIcon className="size-4" /> : <PlayIcon className="size-4" />}
                </span>
                <span className="flex min-w-0 flex-1 flex-col text-left">
                  <span className={cn("text-body", done ? "text-ink-700" : "text-ink-900")}>
                    {`${index + 1}. ${v.title}`}
                  </span>
                  <span className="text-small text-ink-500">
                    {[
                      done && v.watchedAt ? `İzlendi · ${formatDateTr(v.watchedAt)}` : null,
                      v.durationSeconds ? formatDuration(v.durationSeconds / 60) : null,
                      v.topicName,
                      readOnly && v.note ? `Not: ${v.note}` : null,
                    ]
                      .filter(Boolean)
                      .join(" · ") || "—"}
                  </span>
                </span>
              </>
            );
            return (
              <li
                key={v.videoId}
                data-testid="video-item"
                data-done={done}
                aria-current={isCurrent ? "true" : undefined}
              >
                {readOnly ? (
                  <div className="flex min-h-11 items-center gap-3 px-4 py-2.5">{content}</div>
                ) : (
                  <Link
                    href={`${basePath}?v=${v.videoId}`}
                    className={cn(
                      "flex min-h-12 items-center gap-3 px-4 py-2.5 hover:bg-bg-surface",
                      isCurrent && "bg-bg-surface",
                    )}
                  >
                    {content}
                  </Link>
                )}
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
