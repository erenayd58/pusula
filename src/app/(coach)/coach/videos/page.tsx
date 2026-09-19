import type { Metadata } from "next";
import { VideoCatalog, listCatalog } from "@/features/videos";
import { requireRole } from "@/lib/auth";

export const metadata: Metadata = { title: "Videolar" };

/** Koç video kataloğu (flat): kurum listeleri + "Öğrenci ekledi" bölümü. */
export default async function CoachVideosPage() {
  await requireRole("coach", "owner");
  const { shared, studentAdded } = await listCatalog();

  return (
    <>
      <header className="flex flex-col gap-1">
        <h1 className="text-title font-semibold tracking-tight">Videolar</h1>
        <p className="text-small text-ink-500">
          YouTube oynatma listeleri; videoları konulara eşle, öğrenciye ata; izleme işaretleri
          burada ve planda görünür.
        </p>
      </header>
      <VideoCatalog shared={shared} studentAdded={studentAdded} />
    </>
  );
}
