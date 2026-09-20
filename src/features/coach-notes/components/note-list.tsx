import { StickyNoteIcon } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import type { CoachNote } from "../types";
import { NoteItem } from "./note-item";

export type NoteAudience = "coach" | "student" | "parent";

const EMPTY: Record<NoteAudience, { title: string; description: string }> = {
  coach: {
    title: "Henüz not yok",
    description: "İlk notu yaz; görünürlüğü seçerek öğrenciye ya da veliye açabilirsin.",
  },
  student: {
    title: "Henüz not yok",
    description: "Koçun sana açık bir not yazdığında burada görünür.",
  },
  parent: {
    title: "Henüz not yok",
    description: "Koç size açık bir not yazdığında burada görünür.",
  },
};

/**
 * Not listesi (12 §2 Adım 3): sabitlenmiş önce, sonra tarih azalan (sorgu sıralar). Koç
 * sürümünde düzenle / sil / sabitle; öğrenci ve veli salt okunur. Yüzey varyantı `data-surface`'ten.
 */
export function NoteList({ notes, audience }: { notes: CoachNote[]; audience: NoteAudience }) {
  if (notes.length === 0) {
    const e = EMPTY[audience];
    return <EmptyState icon={StickyNoteIcon} title={e.title} description={e.description} />;
  }
  return (
    <ul className="flex flex-col gap-3" aria-label="Notlar" data-testid="note-list">
      {notes.map((n) => (
        <NoteItem key={n.id} note={n} audience={audience} />
      ))}
    </ul>
  );
}
