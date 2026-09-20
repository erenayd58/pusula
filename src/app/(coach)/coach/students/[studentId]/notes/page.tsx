import type { Metadata } from "next";
import { NoteForm, NoteList, listNotes } from "@/features/coach-notes";
import { requireRole } from "@/lib/auth";
import { requireModule } from "@/modules/get-enabled-modules";

export const metadata: Metadata = { title: "Notlar" };

/**
 * K2 Notlar sekmesi (flat; 12 §2 Adım 3): üstte yeni not formu (görünürlük çipleri, sabitleme),
 * altta sabitlenmiş önce / tarih azalan liste (düzenle, sil, sabitle). `?new=1` formu odaklı açar
 * (K1 "Not yaz" hızlı eylemi).
 */
export default async function CoachStudentNotesPage({
  params,
  searchParams,
}: PageProps<"/coach/students/[studentId]/notes">) {
  const { studentId } = await params;
  const { new: isNew } = await searchParams;
  await requireRole("coach", "owner");
  await requireModule(studentId, "coach-notes");
  const notes = await listNotes(studentId);

  return (
    <div className="flex flex-col gap-6">
      <section
        aria-labelledby="note-form-heading"
        className="flex flex-col gap-3 rounded-sm border border-line bg-bg-paper p-4"
      >
        <h2 id="note-form-heading" className="text-heading font-semibold text-ink-900">
          Not yaz
        </h2>
        <p className="text-small text-ink-500">
          Görünürlüğü seç: yalnızca sana, öğrenciye, veliye ya da ikisine. Görünür not bildirim
          olarak gider.
        </p>
        <NoteForm studentId={studentId} autoFocus={isNew === "1"} />
      </section>
      <section aria-labelledby="notes-heading" className="flex flex-col gap-3">
        <h2 id="notes-heading" className="text-heading font-semibold text-ink-900">
          Notlar
        </h2>
        <NoteList notes={notes} audience="coach" />
      </section>
    </div>
  );
}
