import "server-only";

import { TZDate } from "@date-fns/tz";
import { addDays } from "date-fns";
import { TIME_ZONE, toDateKey, todayInIstanbul, weekStart } from "@/lib/dates";
import { streakFrom } from "@/lib/dates/streak";
import { wrongPenaltyOf } from "@/lib/exam/net";
import { createClient } from "@/lib/supabase/server";
import type {
  DailyPoint,
  QuestionLogRow,
  QuickLogOptions,
  QuickLogSubject,
  SubjectWeekBar,
} from "../types";

/**
 * Soru takibi okuma sorguları. Kullanıcının oturumuyla çalışır (RLS). "Bugün" ve "bu hafta"
 * `lib/dates` ile İstanbul'a göre; görünümler de aynı kuralı kullanır.
 */

const LOG_SELECT =
  "id, log_date, subject_id, topic_id, section_id, total_count, correct_count, wrong_count, blank_count, duration_minutes, subject:subjects(name, short_name, color), topic:topics(name), section:resource_sections(title, resource:resources(title))" as const;

type LogRowRaw = {
  id: string;
  log_date: string;
  subject_id: string;
  topic_id: string | null;
  total_count: number;
  correct_count: number | null;
  wrong_count: number | null;
  blank_count: number | null;
  duration_minutes: number | null;
  section_id: string | null;
  subject: { name: string; short_name: string; color: string } | null;
  topic: { name: string } | null;
  section: { title: string; resource: { title: string } | null } | null;
};

function toRow(r: LogRowRaw): QuestionLogRow {
  return {
    id: r.id,
    logDate: r.log_date,
    subjectId: r.subject_id,
    subjectName: r.subject?.name ?? "Ders",
    subjectShortName: r.subject?.short_name ?? "—",
    subjectColor: r.subject?.color ?? "subject-r3",
    topicId: r.topic_id,
    topicName: r.topic?.name ?? null,
    sectionId: r.section_id,
    // Faz 7: kaynak bağı etiketi "Tonguç Mat SB · Test 12" (kaynak silinmişse null).
    sectionLabel: r.section
      ? [r.section.resource?.title, r.section.title].filter(Boolean).join(" · ")
      : null,
    total: r.total_count,
    correct: r.correct_count ?? 0,
    wrong: r.wrong_count ?? 0,
    blank: r.blank_count ?? 0,
    durationMinutes: r.duration_minutes,
  };
}

/** Hızlı kayıt seçenekleri: öğrencinin şablonundaki dersler + ünite düzeyi konular + net kuralı. */
export async function getQuickLogOptions(studentId: string): Promise<QuickLogOptions | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("students")
    .select(
      "template:curriculum_templates(scoring, subjects(id, code, name, short_name, color, sort_order, topics(id, name, sort_order, parent_id)))",
    )
    .eq("profile_id", studentId)
    .maybeSingle();
  if (error) throw error;
  if (!data?.template) return null;

  const subjects: QuickLogSubject[] = [...data.template.subjects]
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((s) => ({
      subjectId: s.id,
      code: s.code,
      name: s.name,
      shortName: s.short_name,
      color: s.color,
      topics: s.topics
        .filter((t) => t.parent_id === null)
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((t) => ({ topicId: t.id, name: t.name })),
    }));
  return { subjects, wrongPenalty: wrongPenaltyOf(data.template.scoring) };
}

/** Bugünkü kayıtlar (en yeni önce). */
export async function getTodayLogs(studentId: string, now = new Date()): Promise<QuestionLogRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("question_logs")
    .select(LOG_SELECT)
    .eq("student_id", studentId)
    .eq("log_date", toDateKey(todayInIstanbul(now)))
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data.map(toRow);
}

/** Tarih aralığı ve isteğe bağlı ders filtresiyle kayıtlar (geçmiş sayfası, koç Sorular sekmesi). */
export async function listQuestionLogs(
  studentId: string,
  { from, to, subjectId }: { from: string; to: string; subjectId?: string | null },
): Promise<QuestionLogRow[]> {
  const supabase = await createClient();
  let query = supabase
    .from("question_logs")
    .select(LOG_SELECT)
    .eq("student_id", studentId)
    .gte("log_date", from)
    .lte("log_date", to)
    .order("log_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(500);
  if (subjectId) query = query.eq("subject_id", subjectId);
  const { data, error } = await query;
  if (error) throw error;
  return data.map(toRow);
}

/**
 * Haftanın ders dağılımı, dersin şablon sırasıyla; kayıtsız ders yok. `week` bir tarih (o haftanın
 * pazartesisi bulunur) ya da hafta anahtarı (YYYY-AA-GG pazartesi; veli hafta seçici, Faz 8).
 */
export async function getWeekSubjectDistribution(
  studentId: string,
  week: Date | string = new Date(),
): Promise<SubjectWeekBar[]> {
  const supabase = await createClient();
  const weekKey = typeof week === "string" ? week : toDateKey(weekStart(week));
  const { data, error } = await supabase
    .from("v_student_subject_weekly")
    .select("subject_id, questions, correct")
    .eq("student_id", studentId)
    .eq("week_start", weekKey);
  if (error) throw error;
  const ids = data.map((r) => r.subject_id).filter((id): id is string => id !== null);
  if (ids.length === 0) return [];
  const { data: subjects, error: subjectsError } = await supabase
    .from("subjects")
    .select("id, name, short_name, color, sort_order")
    .in("id", ids)
    .order("sort_order");
  if (subjectsError) throw subjectsError;
  const byId = new Map(data.map((r) => [r.subject_id, r]));
  return subjects.map((s) => ({
    subjectId: s.id,
    name: s.name,
    shortName: s.short_name,
    color: s.color,
    questions: byId.get(s.id)?.questions ?? 0,
    correct: byId.get(s.id)?.correct ?? 0,
  }));
}

/** Haftanın toplamı (veli Özet, Faz 8): soru ve süre (`duration_minutes` girilmiş kayıtlar). */
export async function getWeekTotals(
  studentId: string,
  weekKey: string,
): Promise<{ questions: number; studyMinutes: number }> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("v_student_daily_summary")
    .select("questions, study_minutes")
    .eq("student_id", studentId)
    .gte("day", weekKey)
    .lt("day", toDateKey(addDays(new TZDate(weekKey, TIME_ZONE), 7)));
  if (error) throw error;
  return {
    questions: data.reduce((sum, r) => sum + (r.questions ?? 0), 0),
    studyMinutes: data.reduce((sum, r) => sum + (r.study_minutes ?? 0), 0),
  };
}

/** Seri: son 400 günün kayıt günlerinden (v_student_daily_summary) hesaplanır. */
export async function getStreak(studentId: string, now = new Date()): Promise<number> {
  const supabase = await createClient();
  const today = todayInIstanbul(now);
  const { data, error } = await supabase
    .from("v_student_daily_summary")
    .select("day")
    .eq("student_id", studentId)
    .gte("day", toDateKey(addDays(today, -400)));
  if (error) throw error;
  return streakFrom(
    data.map((r) => r.day).filter((d): d is string => d !== null),
    toDateKey(today),
  );
}

/** Koç genel bakış: bugün, bu hafta ve son 14 günün günlük soru sayısı (boş günler 0). */
export async function getCoachOverview(studentId: string, now = new Date()) {
  const supabase = await createClient();
  const today = todayInIstanbul(now);
  const todayKey = toDateKey(today);
  const weekKey = toDateKey(weekStart(now));
  const fromKey = toDateKey(addDays(today, -13));
  const { data, error } = await supabase
    .from("v_student_daily_summary")
    .select("day, questions, study_minutes")
    .eq("student_id", studentId)
    .gte("day", fromKey < weekKey ? fromKey : weekKey);
  if (error) throw error;
  const byDay = new Map(data.map((r) => [r.day, r]));
  const last14: DailyPoint[] = Array.from({ length: 14 }, (_, i) => {
    const day = toDateKey(addDays(today, i - 13));
    return { day, questions: byDay.get(day)?.questions ?? 0 };
  });
  let weekQuestions = 0;
  for (const r of data) if (r.day && r.day >= weekKey) weekQuestions += r.questions ?? 0;
  return {
    todayQuestions: byDay.get(todayKey)?.questions ?? 0,
    todayMinutes: byDay.get(todayKey)?.study_minutes ?? 0,
    weekQuestions,
    last14,
  };
}
