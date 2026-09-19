import type { Metadata } from "next";
import { NoteList, listNotes } from "@/features/coach-notes";
import { requireRole } from "@/lib/auth";
import { requireModule } from "@/modules/get-enabled-modules";

export const metadata: Metadata = { title: "Notlar" };

/**
 * Öğrenci Notlar (clay; 12 §2 Adım 3, karar E10): koçun sana açık notları, sabitlenmiş önce,
 * tarih azalan (RLS süzer). Masaüstü rayı + "Ben" bağlantısı + bildirimden gelinir.
 */
export default async function StudentNotesPage() {
  const { userId } = await requireRole("student");
  await requireModule(userId, "coach-notes");
  const notes = await listNotes(userId);

  return (
    <>
      <header className="flex flex-col gap-1">
        <h1 className="text-title font-semibold tracking-tight lg:text-title-lg">
          Koçumun notları
        </h1>
        <p className="text-small text-ink-500">Koçunun sana açtığı notlar burada.</p>
      </header>
      <NoteList notes={notes} audience="student" />
    </>
  );
}
