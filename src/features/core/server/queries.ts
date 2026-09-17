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

// Veli ---------------------------------------------------------------------------------

export type ChildRow = { studentId: string; fullName: string };

/** Velinin bağlı olduğu çocuklar (RLS: sadece kendi bağlantıları). */
export async function listChildren(): Promise<ChildRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("student_parents")
    .select(
      "student_id, student:students!student_parents_student_id_fkey(profile:profiles!students_profile_id_fkey(full_name))",
    )
    .order("created_at");
  if (error) throw error;
  return data.map((row) => ({
    studentId: row.student_id,
    fullName: row.student.profile.full_name,
  }));
}

const REQUIRED_CONSENT_TYPES = ["privacy_notice", "explicit_consent"] as const;

/**
 * Velinin çocukları arasında onayı tam olmayanlar: iki zorunlu tür de (`revoked_at` boş)
 * kayıtlı olmalı; kaynak veli dijital onayı ya da koçun işlediği kâğıt onayı olabilir
 * (02 karar #23). Tamsa veli paneli açılır, değilse /consent.
 */
export async function listChildrenNeedingConsent(): Promise<ChildRow[]> {
  const supabase = await createClient();
  const children = await listChildren();
  if (children.length === 0) return [];

  const { data, error } = await supabase
    .from("consents")
    .select("student_id, type")
    .in(
      "student_id",
      children.map((c) => c.studentId),
    )
    .is("revoked_at", null)
    .in("type", [...REQUIRED_CONSENT_TYPES]);
  if (error) throw error;

  const given = new Map<string, Set<string>>();
  for (const row of data) {
    const types = given.get(row.student_id) ?? new Set<string>();
    types.add(row.type);
    given.set(row.student_id, types);
  }
  return children.filter(
    (c) => !REQUIRED_CONSENT_TYPES.every((t) => given.get(c.studentId)?.has(t)),
  );
}

// Öğrenci başlığı ---------------------------------------------------------------------

export type StudentHeader = {
  studentId: string;
  fullName: string;
  grade: number;
  classSection: string | null;
  schoolName: string | null;
  examDate: string | null;
  status: "active" | "paused" | "archived";
};

/**
 * Kabuk başlıkları için öğrenci özeti (öğrenci kendisi, koç öğrencisi, veli çocuğu).
 * RLS satırı vermezse null; çağıran `notFound()` kararını verir.
 */
export async function getStudentHeader(studentId: string): Promise<StudentHeader | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("students")
    .select(
      "profile_id, grade, class_section, school_name, exam_date, status, profile:profiles!students_profile_id_fkey(full_name)",
    )
    .eq("profile_id", studentId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    studentId: data.profile_id,
    fullName: data.profile.full_name,
    grade: data.grade,
    classSection: data.class_section,
    schoolName: data.school_name,
    examDate: data.exam_date,
    status: data.status,
  };
}

// KVKK onay durumu ---------------------------------------------------------------------

export type ConsentStatus = {
  /** İki zorunlu tür de (herhangi bir kaynaktan, geri çekilmemiş) kayıtlıysa true. */
  complete: boolean;
  latest: { givenAt: string; source: "parent" | "paper"; documentVersion: string } | null;
};

/**
 * Öğrencinin onay tamlığı: `privacy_notice` + `explicit_consent`, `revoked_at` boş; veli
 * dijital (given_by) ya da koçun işlediği kâğıt onayı (recorded_by) fark etmez (02 karar #23).
 */
export async function getConsentStatus(studentId: string): Promise<ConsentStatus> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("consents")
    .select("type, given_at, given_by, document_version")
    .eq("student_id", studentId)
    .is("revoked_at", null)
    .in("type", [...REQUIRED_CONSENT_TYPES])
    .order("given_at", { ascending: false });
  if (error) throw error;

  const types = new Set(data.map((r) => r.type));
  const complete = REQUIRED_CONSENT_TYPES.every((t) => types.has(t));
  const first = data[0];
  return {
    complete,
    latest: first
      ? {
          givenAt: first.given_at,
          source: first.given_by ? "parent" : "paper",
          documentVersion: first.document_version,
        }
      : null,
  };
}
