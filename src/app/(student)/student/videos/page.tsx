import type { Metadata } from "next";
import Link from "next/link";
import { PlusIcon, VideoIcon } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { StudentPlaylistList, listStudentPlaylists } from "@/features/videos";
import { requireRole } from "@/lib/auth";
import { requireModule } from "@/modules/get-enabled-modules";

export const metadata: Metadata = { title: "Videolarım" };

const BASE = "/student/videos";

/** Öğrenci video listeleri (clay): atanmış listeler + ilerleme; "+ Liste ekle". */
export default async function StudentVideosPage() {
  const { userId } = await requireRole("student");
  await requireModule(userId, "videos");
  const rows = await listStudentPlaylists(userId);

  return (
    <>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-title font-semibold tracking-tight lg:text-title-lg">Videolarım</h1>
          <p className="text-small text-ink-500">
            Ders videolarını burada izle, bitirince “İzledim” de; ilerlemen listede görünür.
          </p>
        </div>
        <Button asChild>
          <Link href={`${BASE}/new`}>
            <PlusIcon aria-hidden="true" />
            Liste ekle
          </Link>
        </Button>
      </header>

      {rows.length === 0 ? (
        <EmptyState
          icon={VideoIcon}
          title="Henüz video listen yok"
          description="Koçun atadığında burada görünür; istersen bir YouTube listesi ya da kendi listeni ekleyebilirsin."
          action={
            <Button asChild>
              <Link href={`${BASE}/new`}>Liste ekle</Link>
            </Button>
          }
        />
      ) : (
        <StudentPlaylistList rows={rows} basePath={BASE} />
      )}
    </>
  );
}
