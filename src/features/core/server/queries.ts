import "server-only";

import { createClient } from "@/lib/supabase/server";

/**
 * Çekirdek modül okuma sorguları. Kullanıcının oturumuyla çalışır; RLS koçun yalnızca kendi
 * öğrencilerini, owner'ın kurumdakilerin tümünü görmesini sağlar (03 §5.3).
 */

export type StudentListRow = {
  profileId: string;
  fullName: string;
  username: string | null;
  status: "active" | "paused" | "archived";
  season: string;
  coachId: string;
  coachName: string | null;
};

export async function listStudents(): Promise<StudentListRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("students")
    .select(
      "profile_id, coach_id, season, status, profile:profiles!students_profile_id_fkey(full_name, username), coach:profiles!students_coach_id_fkey(full_name)",
    )
    .order("created_at", { ascending: false });
  if (error) throw error;

  return data.map((row) => ({
    profileId: row.profile_id,
    fullName: row.profile.full_name,
    username: row.profile.username,
    status: row.status,
    season: row.season,
    coachId: row.coach_id,
    coachName: row.coach?.full_name ?? null,
  }));
}

export type CoachOption = { id: string; fullName: string; role: "coach" | "owner" };

/** Owner'ın öğrenci atayabileceği koçlar (kurumdaki coach ve owner profilleri). */
export async function listCoaches(): Promise<CoachOption[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, role")
    .in("role", ["coach", "owner"])
    .order("full_name");
  if (error) throw error;
  return data.flatMap((p) =>
    p.role === "coach" || p.role === "owner"
      ? [{ id: p.id, fullName: p.full_name, role: p.role }]
      : [],
  );
}
