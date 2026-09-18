import "server-only";

import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { parseOrgSettings, type OrgSettings } from "../lib/org-settings";

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
  /** Son kayıt günü (YYYY-AA-GG) ya da hiç kayıt yoksa null. */
  lastLogDate: string | null;
  /** Bu hafta (pazartesiden) çözülen soru. */
  weekQuestions: number;
  weeklyTarget: number | null;
  /** 0-100; haftalık hedef yoksa null. */
  weekGoalPercent: number | null;
  /** Bu haftanın yayınlanmış planında tamamlanan / toplam (0-100); plan yoksa null (Faz 4b). */
  planPercentWeek: number | null;
};

/**
 * K1 öğrenci listesi: tek sorgu, `v_coach_student_overview` (security_invoker; koç kendi
 * öğrencilerini, owner kurumu görür). Koç adları ikinci küçük sorguyla (owner sütunu).
 */
export async function listStudents(): Promise<StudentListRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("v_coach_student_overview")
    .select(
      "student_id, coach_id, full_name, username, status, season, last_log_date, week_questions, weekly_target, week_goal_percent, plan_percent_week",
    )
    .order("full_name");
  if (error) throw error;

  const coachIds = [...new Set(data.map((r) => r.coach_id).filter((id): id is string => !!id))];
  const coachNames = new Map<string, string>();
  if (coachIds.length > 0) {
    const { data: coaches, error: coachError } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", coachIds);
    if (coachError) throw coachError;
    for (const c of coaches) coachNames.set(c.id, c.full_name);
  }

  return data.flatMap((row) =>
    row.student_id && row.coach_id && row.full_name && row.status && row.season
      ? [
          {
            profileId: row.student_id,
            fullName: row.full_name,
            username: row.username,
            status: row.status,
            season: row.season,
            coachId: row.coach_id,
            coachName: coachNames.get(row.coach_id) ?? null,
            lastLogDate: row.last_log_date,
            weekQuestions: row.week_questions ?? 0,
            weeklyTarget: row.weekly_target === null ? null : Number(row.weekly_target),
            weekGoalPercent: row.week_goal_percent,
            planPercentWeek: row.plan_percent_week,
          },
        ]
      : [],
  );
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
  /** Koçun adı (profiles RLS: öğrenci ve veli koçu görür). */
  coachName: string | null;
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
      "profile_id, grade, class_section, school_name, exam_date, status, profile:profiles!students_profile_id_fkey(full_name), coach:profiles!students_coach_id_fkey(full_name)",
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
    coachName: data.coach?.full_name ?? null,
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

// Kurum ayarları -----------------------------------------------------------------------

/**
 * Oturum sahibinin kurumunun ayarları (08 §1.2). RLS herkese yalnızca kendi kurumunu gösterir;
 * eksik/bozuk anahtarlar şemadaki varsayılanla tamamlanır. İstek başına bir kez (React cache).
 */
export const getOrgSettings = cache(async (): Promise<OrgSettings> => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("organizations")
    .select("settings")
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return parseOrgSettings(data?.settings);
});
