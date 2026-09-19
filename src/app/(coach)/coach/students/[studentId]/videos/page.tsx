import type { Metadata } from "next";
import Link from "next/link";
import { VideoIcon } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { VideoProgressTable, listStudentPlaylists, listStudentVideos } from "@/features/videos";
import { requireRole } from "@/lib/auth";
import { requireModule } from "@/modules/get-enabled-modules";

export const metadata: Metadata = { title: "Videolar" };

/** K2 Videolar sekmesi (flat): atanmış listeler + ilerleme; video listesi ve notlar salt okunur. */
export default async function CoachStudentVideosPage({
  params,
}: PageProps<"/coach/students/[studentId]/videos">) {
  const { studentId } = await params;
  await requireRole("coach", "owner");
  await requireModule(studentId, "videos");
  const [rows, videos] = await Promise.all([
    listStudentPlaylists(studentId),
    listStudentVideos(studentId),
  ]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-small text-ink-500">
          Atanmış video listeleri ve izleme işaretleri (öğrenci elle işaretler; süre ölçülmez).
          Atama katalogdan yapılır.
        </p>
        <Button variant="secondary" asChild>
          <Link href="/coach/videos">Kataloğu aç</Link>
        </Button>
      </div>
      {rows.length === 0 ? (
        <EmptyState
          icon={VideoIcon}
          title="Atanmış video listesi yok"
          description="Katalogdan bir liste ata; öğrenci izledikçe ilerleme burada görünür."
          action={
            <Button asChild>
              <Link href="/coach/videos">Kataloğu aç</Link>
            </Button>
          }
        />
      ) : (
        <VideoProgressTable studentId={studentId} rows={rows} videos={videos} />
      )}
    </div>
  );
}
