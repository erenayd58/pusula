import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeftIcon, PencilIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  PlaylistForm,
  StudentPlaylistPlayer,
  VideoEditor,
  getPlaylist,
  getStudentPlaylist,
  getVideoOptions,
} from "@/features/videos";
import { requireRole } from "@/lib/auth";
import { requireModule } from "@/modules/get-enabled-modules";

export const metadata: Metadata = { title: "Video listesi" };

const BASE = "/student/videos";

/**
 * Oynatıcı (öğrenci, clay): `?v=` seçili video; "İzledim", not, sonraki video; liste satırları.
 * Öğrencinin kendi listesinde "Düzenle" (`?edit=1`): liste alanları + video editörü.
 */
export default async function StudentPlaylistPage({
  params,
  searchParams,
}: PageProps<"/student/videos/[playlistId]">) {
  const { playlistId } = await params;
  const { v, edit } = await searchParams;
  const { userId } = await requireRole("student");
  await requireModule(userId, "videos");
  const detail = await getStudentPlaylist(userId, playlistId);
  if (!detail) notFound();

  if (edit === "1" && detail.playlist.isOwn) {
    const playlist = await getPlaylist(playlistId);
    const options = playlist ? await getVideoOptions(playlist.templateId) : null;
    if (!playlist || !options) notFound();
    return (
      <>
        <header className="flex flex-col gap-1">
          <Button variant="ghost" asChild className="w-fit">
            <Link href={`${BASE}/${playlistId}`}>
              <ArrowLeftIcon aria-hidden="true" />
              Listeye dön
            </Link>
          </Button>
          <h1 className="text-title font-semibold tracking-tight lg:text-title-lg">
            {playlist.title}
          </h1>
        </header>
        <PlaylistForm
          options={options}
          catalog={[]}
          audience="student"
          basePath={BASE}
          playlist={playlist}
        />
        <VideoEditor playlist={playlist} options={options} />
      </>
    );
  }

  return (
    <>
      <header className="flex flex-col gap-1">
        <Button variant="ghost" asChild className="w-fit">
          <Link href={BASE}>
            <ArrowLeftIcon aria-hidden="true" />
            Videolarım
          </Link>
        </Button>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <h1 className="text-title font-semibold tracking-tight lg:text-title-lg">
            {detail.playlist.title}
          </h1>
          {detail.playlist.isOwn ? (
            <Button variant="secondary" asChild>
              <Link href={`${BASE}/${playlistId}?edit=1`}>
                <PencilIcon aria-hidden="true" />
                Düzenle
              </Link>
            </Button>
          ) : null}
        </div>
      </header>
      <StudentPlaylistPlayer
        studentId={userId}
        playlist={detail.playlist}
        videos={detail.videos}
        selectedVideoId={typeof v === "string" ? v : null}
        basePath={`${BASE}/${playlistId}`}
      />
    </>
  );
}
