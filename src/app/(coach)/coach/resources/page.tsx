import type { Metadata } from "next";
import { ResourceCatalog, listCatalog } from "@/features/resources";
import { requireRole } from "@/lib/auth";

export const metadata: Metadata = { title: "Kaynaklar" };

/** Koç kaynak kataloğu (flat): kurum kataloğu + "Öğrenci ekledi" bölümü. */
export default async function CoachResourcesPage() {
  await requireRole("coach", "owner");
  const { shared, studentAdded } = await listCatalog();

  return (
    <>
      <header className="flex flex-col gap-1">
        <h1 className="text-title font-semibold tracking-tight">Kaynaklar</h1>
        <p className="text-small text-ink-500">
          Kitap ve test kataloğu; öğrenciye atadığın kitapların ilerlemesi soru kayıtlarından
          hesaplanır.
        </p>
      </header>
      <ResourceCatalog shared={shared} studentAdded={studentAdded} />
    </>
  );
}
