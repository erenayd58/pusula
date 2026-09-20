import type { NoteVisibility } from "@/types";

/** Koç notu (RLS okuyana göre süzer: koç hepsi, öğrenci/veli yalnızca kendine açık olanlar). */
export type CoachNote = {
  id: string;
  studentId: string;
  authorId: string | null;
  authorName: string | null;
  body: string;
  visibility: NoteVisibility;
  isPinned: boolean;
  createdAt: string;
  updatedAt: string;
};
