import type { Metadata } from "next";
import { EmptyState } from "@/components/shared/empty-state";
import {
  PlaylistForm,
  getStudentTemplateId,
  getVideoOptions,
  listCatalogTitles,
} from "@/features/videos";
import { requireRole } from "@/lib/auth";
import { requireModule } from "@/modules/get-enabled-modules";

export const metadata: Metadata = { title: "Liste ekle" };

/** Öğrenci liste ekleme (clay): YouTube bağlantısı ya da elle liste; kaydedince kendisine atanır. */
export default async function StudentNewPlaylistPage() {
  const { userId } = await requireRole("student");
  await requireModule(userId, "videos");
  const templateId = await getStudentTemplateId(userId);
  const [options, catalog] = await Promise.all([
    templateId ? getVideoOptions(templateId) : Promise.resolve(null),
    listCatalogTitles(userId),
  ]);

  return (
    <>
      <header className="flex flex-col gap-1">
        <h1 className="text-title font-semibold tracking-tight lg:text-title-lg">Liste ekle</h1>
        <p className="text-small text-ink-500">
          Bir YouTube oynatma listesi bağlantısı yapıştır ya da kendi listeni kur.
        </p>
      </header>
      {options ? (
        <PlaylistForm
          options={options}
          catalog={catalog}
          audience="student"
          basePath="/student/videos"
        />
      ) : (
        <EmptyState
          title="Konu listen henüz yok"
          description="Liste eklemek için koçunun sana bir konu listesi (şablon) ataması gerekiyor."
        />
      )}
    </>
  );
}
