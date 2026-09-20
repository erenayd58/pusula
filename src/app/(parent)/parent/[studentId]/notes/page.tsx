import type { Metadata } from "next";
import { NoteList, listNotes } from "@/features/coach-notes";
import { requireRole } from "@/lib/auth";
import { requireModule } from "@/modules/get-enabled-modules";

export const metadata: Metadata = { title: "Notlar" };

/**
 * Veli Notlar sekmesi (clay-calm; 12 §2 Adım 3): koçun veliye açık notları, sabitlenmiş önce,
 * tarih azalan (RLS süzer). Salt okunur; "siz" dili.
 */
export default async function ParentNotesPage({ params }: PageProps<"/parent/[studentId]/notes">) {
  const { studentId } = await params;
  await requireRole("parent");
  await requireModule(studentId, "coach-notes");
  const notes = await listNotes(studentId);

  return (
    <section aria-labelledby="notes-heading" className="flex flex-col gap-3">
      <h2 id="notes-heading" className="text-heading font-semibold text-ink-900">
        Koçun notları
      </h2>
      <p className="text-small text-ink-500">Koçunuzun sizinle paylaştığı notlar.</p>
      <NoteList notes={notes} audience="parent" />
    </section>
  );
}
