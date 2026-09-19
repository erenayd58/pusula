import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { CoachNote } from "../types";

const SELECT =
  "id, student_id, author_id, body, visibility, is_pinned, created_at, updated_at, author:profiles!coach_notes_author_id_fkey(full_name)";

type Row = {
  id: string;
  student_id: string;
  author_id: string | null;
  body: string;
  visibility: CoachNote["visibility"];
  is_pinned: boolean;
  created_at: string;
  updated_at: string;
  author: { full_name: string } | null;
};

function toNote(r: Row): CoachNote {
  return {
    id: r.id,
    studentId: r.student_id,
    authorId: r.author_id,
    authorName: r.author?.full_name ?? null,
    body: r.body,
    visibility: r.visibility,
    isPinned: r.is_pinned,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

/**
 * Öğrencinin notları: sabitlenmiş önce, sonra tarih azalan. RLS okuyana göre süzer (koç hepsi,
 * öğrenci `student`/`student_and_parent`, veli `parent`/`student_and_parent`); rol kontrolü yok.
 */
export async function listNotes(studentId: string): Promise<CoachNote[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("coach_notes")
    .select(SELECT)
    .eq("student_id", studentId)
    .order("is_pinned", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data.map(toNote);
}

/** Veli Özet kartı: veliye açık son not (RLS zaten süzer; en yenisi). */
export async function getLastParentNote(studentId: string): Promise<CoachNote | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("coach_notes")
    .select(SELECT)
    .eq("student_id", studentId)
    .in("visibility", ["parent", "student_and_parent"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data ? toNote(data) : null;
}

/** K2 Genel bakış: sabitlenmiş en yeni not (koç). */
export async function getPinnedNote(studentId: string): Promise<CoachNote | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("coach_notes")
    .select(SELECT)
    .eq("student_id", studentId)
    .eq("is_pinned", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data ? toNote(data) : null;
}
