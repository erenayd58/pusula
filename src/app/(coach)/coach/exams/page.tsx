import type { Metadata } from "next";
import { MockExamCatalog, listCatalogTemplates, listMockExams } from "@/features/mock-exams";
import { requireRole } from "@/lib/auth";

export const metadata: Metadata = { title: "Denemeler" };

/** Koç deneme kataloğu (flat): kurumun denemeleri; satır → karşılaştırma; tanımla / düzenle / sil. */
export default async function CoachExamsPage() {
  await requireRole("coach", "owner");
  const [exams, templates] = await Promise.all([listMockExams(), listCatalogTemplates()]);

  return (
    <>
      <header className="flex flex-col gap-1">
        <h1 className="text-title font-semibold tracking-tight">Denemeler</h1>
        <p className="text-small text-ink-500">
          Yayınevi denemelerinin kataloğu; aynı denemeyi giren öğrencileri karşılaştır.
        </p>
      </header>
      <MockExamCatalog exams={exams} templates={templates} />
    </>
  );
}
