import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeftIcon } from "lucide-react";
import { SubjectBadge } from "@/components/shared/subject-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDateTr } from "@/lib/format";
import {
  AssignedPlaylistStudents,
  PlaylistActions,
  PlaylistForm,
  VideoEditor,
  getPlaylist,
  getVideoOptions,
  listStudentsForAssign,
} from "@/features/videos";
import { requireRole } from "@/lib/auth";

export const metadata: Metadata = { title: "Video listesi" };

const BASE = "/coach/videos";

/**
 * Koç liste detayı (flat): başlık + eylemler (Düzenle / Katalogda tut / Kaldır), video editörü
 * (konuya eşleme, video ekle, listeyi yenile), atanan öğrenciler + "Öğrenciye ata". `?edit=1`.
 */
export default async function CoachPlaylistPage({
  params,
  searchParams,
}: PageProps<"/coach/videos/[playlistId]">) {
  const { playlistId } = await params;
  const { edit } = await searchParams;
  await requireRole("coach", "owner");
  const playlist = await getPlaylist(playlistId);
  if (!playlist) notFound();
  const [options, students] = await Promise.all([
    getVideoOptions(playlist.templateId),
    listStudentsForAssign(playlist.id),
  ]);
  if (!options) notFound();

  return (
    <>
      <header className="flex flex-col gap-2">
        <Button variant="ghost" asChild className="w-fit">
          <Link href={BASE}>
            <ArrowLeftIcon aria-hidden="true" />
            Videolar
          </Link>
        </Button>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex flex-col gap-1">
            <h1 className="text-title font-semibold tracking-tight">{playlist.title}</h1>
            <p className="flex flex-wrap items-center gap-2 text-small text-ink-500">
              {playlist.subjectColor && playlist.subjectShortName ? (
                <SubjectBadge color={playlist.subjectColor} shortName={playlist.subjectShortName} />
              ) : (
                <Badge>Karışık</Badge>
              )}
              {playlist.channelName ? <span>{playlist.channelName}</span> : null}
              <span>
                {playlist.youtubePlaylistId
                  ? `· YouTube listesi${playlist.importedAt ? ` · son alındı ${formatDateTr(playlist.importedAt)}` : ""}`
                  : "· Elle kurulan liste"}
              </span>
            </p>
          </div>
          {edit === "1" ? null : <PlaylistActions playlist={playlist} />}
        </div>
      </header>

      {edit === "1" ? (
        <PlaylistForm
          options={options}
          catalog={[]}
          audience="coach"
          basePath={BASE}
          playlist={playlist}
        />
      ) : (
        <>
          <VideoEditor playlist={playlist} options={options} />
          <AssignedPlaylistStudents playlist={playlist} students={students} />
        </>
      )}
    </>
  );
}
