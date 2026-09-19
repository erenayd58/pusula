import type { Metadata } from "next";
import { EmptyState } from "@/components/shared/empty-state";
import {
  ResourceForm,
  getResourceOptions,
  getStudentTemplateId,
  listCatalogTitles,
} from "@/features/resources";
import { requireRole } from "@/lib/auth";
import { requireModule } from "@/modules/get-enabled-modules";

export const metadata: Metadata = { title: "Kaynak ekle" };

/** Öğrenci kaynak ekleme (clay): aynı form; kaydedince kaynak kendisine atanır. */
export default async function StudentNewResourcePage() {
  const { userId } = await requireRole("student");
  await requireModule(userId, "resources");
  const templateId = await getStudentTemplateId(userId);
  const [options, catalog] = await Promise.all([
    templateId ? getResourceOptions(templateId) : Promise.resolve(null),
    listCatalogTitles(userId),
  ]);

  return (
    <>
      <header className="flex flex-col gap-1">
        <h1 className="text-title font-semibold tracking-tight lg:text-title-lg">Kaynak ekle</h1>
        <p className="text-small text-ink-500">
          Kitabını tanımla, testlerini tek hamlede üret; kaydedince listene eklenir.
        </p>
      </header>
      {options ? (
        <ResourceForm
          options={options}
          catalog={catalog}
          audience="student"
          basePath="/student/resources"
        />
      ) : (
        <EmptyState
          title="Konu listen henüz yok"
          description="Kaynak eklemek için koçunun sana bir konu listesi (şablon) ataması gerekiyor."
        />
      )}
    </>
  );
}
