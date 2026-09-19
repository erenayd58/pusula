import "server-only";

import { cache } from "react";
import { getOrgSettings } from "@/features/core";
import { daysSince, daysUntil, toDateKey, todayInIstanbul, weekStart } from "@/lib/dates";
import { combineGap, mockSubjectGap } from "@/lib/strategy/gap";
import { periodFor } from "@/lib/strategy/periods";
import { createClient } from "@/lib/supabase/server";
import { alertThresholds, evaluateSetupAlerts, evaluateTopicAlerts } from "../lib/alerts";
import { evaluateStudentAlerts } from "../lib/student-alerts";
import {
  buildSuggestions,
  dismissalKey,
  plannedKey,
  type Suggestion,
  type TopicMedia,
} from "../lib/suggestions";
import type {
  SetupAlert,
  SetupFacts,
  StudentAlert,
  StudentAlertFacts,
  StudentStrategy,
  TopicAlert,
  TopicAlertFacts,
} from "../types";

/**
 * Uyarı okuma sorguları. `v_topic_alert_facts` security_invoker: koç kendi öğrencilerini, owner
 * kurumu, öğrenci kendini görür; `studentIds` verilmezse görünen tüm öğrenciler (K1 tek sorgu).
 * Karar TypeScript'te (`evaluateTopicAlerts`), eşikler kurum ayarından.
 */

const FACT_SELECT =
  "student_id, organization_id, coach_id, subject_id, subject_name, subject_short_name, subject_color, subject_sort_order, exam_question_count, topic_id, topic_name, topic_sort_order, status, status_changed_at, completed_at, last_reviewed_at, questions_window, correct_window, last_topic_log_date, subject_last_log_date, student_first_log_date, is_next_topic, school_finish_on, mock_recent_count, mock_wrong_recent, mistakes_window" as const;

/** Görünen öğrencilerin kapalı modülleri (student_modules.enabled = false): öğrenci → modül kümesi. */
const listDisabledModules = cache(async (): Promise<Map<string, Set<string>>> => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("student_modules")
    .select("student_id, module_id")
    .eq("enabled", false);
  if (error) throw error;
  const out = new Map<string, Set<string>>();
  for (const r of data)
    (out.get(r.student_id) ?? out.set(r.student_id, new Set()).get(r.student_id))!.add(r.module_id);
  return out;
});

/** Analiz modülü kapatılan öğrenciler; K1 tek sorguda onları dışarıda bırakır. */
async function listAnalyticsDisabled(): Promise<Set<string>> {
  const disabled = await listDisabledModules();
  return new Set([...disabled].filter(([, mods]) => mods.has("analytics")).map(([id]) => id));
}

/**
 * Aynı istekte aynı öğrenci kümesi için tek sorgu (React `cache`): K1 sayfası uyarıları hem
 * doğrudan hem `getSuggestions` üzerinden ister. Anahtar dizi kimliği değil içeriği olsun diye
 * öğrenci listesi metne çevrilir.
 */
const fetchTopicAlertFacts = cache(async (key: string): Promise<TopicAlertFacts[]> => {
  const studentIds = key === "*" ? undefined : key.split(",");
  const supabase = await createClient();
  let query = supabase
    .from("v_topic_alert_facts")
    .select(FACT_SELECT)
    .order("student_id")
    .order("subject_sort_order")
    .order("topic_sort_order");
  if (studentIds) query = query.in("student_id", studentIds);
  const [{ data, error }, disabled] = await Promise.all([query, listAnalyticsDisabled()]);
  if (error) throw error;

  return data.flatMap((r) =>
    r.student_id &&
    !disabled.has(r.student_id) &&
    r.organization_id &&
    r.coach_id &&
    r.subject_id &&
    r.subject_name &&
    r.subject_short_name &&
    r.subject_color &&
    r.topic_id &&
    r.topic_name &&
    r.status
      ? [
          {
            studentId: r.student_id,
            organizationId: r.organization_id,
            coachId: r.coach_id,
            subjectId: r.subject_id,
            subjectName: r.subject_name,
            subjectShortName: r.subject_short_name,
            subjectColor: r.subject_color,
            subjectSortOrder: r.subject_sort_order ?? 0,
            examQuestionCount: r.exam_question_count,
            topicId: r.topic_id,
            topicName: r.topic_name,
            topicSortOrder: r.topic_sort_order ?? 0,
            status: r.status,
            statusChangedAt: r.status_changed_at,
            completedAt: r.completed_at,
            lastReviewedAt: r.last_reviewed_at,
            questionsWindow: r.questions_window ?? 0,
            correctWindow: r.correct_window ?? 0,
            lastTopicLogDate: r.last_topic_log_date,
            subjectLastLogDate: r.subject_last_log_date,
            studentFirstLogDate: r.student_first_log_date,
            isNextTopic: r.is_next_topic ?? false,
            schoolFinishOn: r.school_finish_on,
            mockRecentCount: r.mock_recent_count ?? 0,
            mockWrongRecent: r.mock_wrong_recent ?? 0,
            mistakesWindow: r.mistakes_window ?? 0,
          },
        ]
      : [],
  );
});

export async function getTopicAlertFacts(studentIds?: string[]): Promise<TopicAlertFacts[]> {
  if (studentIds && studentIds.length === 0) return [];
  return fetchTopicAlertFacts(studentIds ? [...studentIds].sort().join(",") : "*");
}

/** Olgular + kurum eşikleri → uyarılar (öncelik sırasında). Tek öğrenci ya da liste. */
export async function getTopicAlerts(studentIds?: string | string[]): Promise<TopicAlert[]> {
  const ids = typeof studentIds === "string" ? [studentIds] : studentIds;
  const [facts, settings] = await Promise.all([getTopicAlertFacts(ids), getOrgSettings()]);
  return evaluateTopicAlerts(facts, alertThresholds(settings), toDateKey(todayInIstanbul()));
}

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/**
 * Strateji bağlamı (09 §2 Parça 3): kurum dönemleri (`periodFor` → karışım) + `students.exam_date`
 * (sınava kalan gün) + `v_student_pace_facts` (hedef tarihi geçmiş bitmemiş konular → gecikme günü)
 * + `v_student_subject_targets` (ders soru açığı: (bugüne kadar beklenen − gerçekleşen) / beklenen;
 * beklenen = hedef × geçen gün / toplam gün, `target_starts_on` → `exam_date`) +
 * `v_student_mock_subject_stats` (Faz 6b: deneme açığı `mockSubjectGap`, `combineGap` ile
 * `mock_exams.gap_weight` ağırlığında; `subjectMockWrong` "son 3 denemede 7 yanlış" notu için).
 * Görünümler security_invoker; hedefi ve denemesi olmayan öğrencide boş Map'ler. `getSuggestions`
 * çağıran her yerde (K1, K2, plan havuzu, "Önerilen planı hazırla") aynı bağlam; aynı istekte tek
 * sorgu (React `cache`).
 */
const fetchStrategyContext = cache(async (key: string): Promise<Map<string, StudentStrategy>> => {
  const studentIds = key === "*" ? undefined : key.split(",");
  const supabase = await createClient();
  const today = toDateKey(todayInIstanbul());

  let studentQuery = supabase
    .from("students")
    .select("profile_id, exam_date, target_starts_on")
    .eq("status", "active");
  if (studentIds) studentQuery = studentQuery.in("profile_id", studentIds);
  let paceQuery = supabase
    .from("v_student_pace_facts")
    .select("student_id, topic_id, status, target_on")
    .lt("target_on", today)
    .not("status", "in", "(completed,mastered)");
  if (studentIds) paceQuery = paceQuery.in("student_id", studentIds);
  let subjectQuery = supabase
    .from("v_student_subject_targets")
    .select("student_id, subject_id, questions_target, questions_done")
    .not("questions_target", "is", null);
  if (studentIds) subjectQuery = subjectQuery.in("student_id", studentIds);
  let mockQuery = supabase
    .from("v_student_mock_subject_stats")
    .select("student_id, subject_id, exams_count, avg_net, wrong_total, exam_question_count")
    .gt("exams_count", 0);
  if (studentIds) mockQuery = mockQuery.in("student_id", studentIds);

  const [settings, students, pace, subjects, mocks] = await Promise.all([
    getOrgSettings(),
    studentQuery,
    paceQuery,
    subjectQuery,
    mockQuery,
  ]);
  if (students.error) throw students.error;
  if (pace.error) throw pace.error;
  if (subjects.error) throw subjects.error;
  if (mocks.error) throw mocks.error;

  const mix = periodFor(settings.strategy.periods, today)?.mix ?? null;
  const topicDelay = new Map<string, Map<string, number>>();
  const questionGap = new Map<string, Map<string, number>>();
  const mockGap = new Map<string, Map<string, number>>();
  const mockWrong = new Map<string, Map<string, { wrong: number; exams: number }>>();
  const bucket = <T>(store: Map<string, Map<string, T>>, studentId: string) =>
    store.get(studentId) ?? store.set(studentId, new Map<string, T>()).get(studentId)!;

  for (const r of pace.data) {
    if (!r.student_id || !r.topic_id || !r.target_on) continue;
    const delay = daysSince(r.target_on, today);
    if (delay > 0) bucket(topicDelay, r.student_id).set(r.topic_id, delay);
  }
  const byId = new Map(students.data.map((r) => [r.profile_id, r]));
  for (const r of subjects.data) {
    if (!r.student_id || !r.subject_id || r.questions_target === null) continue;
    const student = byId.get(r.student_id);
    if (!student?.target_starts_on || !student.exam_date) continue;
    const totalDays = daysSince(student.target_starts_on, student.exam_date);
    const elapsedDays = daysSince(student.target_starts_on, today);
    if (totalDays <= 0 || elapsedDays <= 0) continue;
    const expected = (r.questions_target * Math.min(elapsedDays, totalDays)) / totalDays;
    bucket(questionGap, r.student_id).set(
      r.subject_id,
      clamp01((expected - (r.questions_done ?? 0)) / expected),
    );
  }
  for (const r of mocks.data) {
    if (!r.student_id || !r.subject_id) continue;
    const gap = mockSubjectGap({
      avgNet: Number(r.avg_net ?? 0),
      questionCount: r.exam_question_count,
    });
    if (gap !== undefined) bucket(mockGap, r.student_id).set(r.subject_id, gap);
    bucket(mockWrong, r.student_id).set(r.subject_id, {
      wrong: r.wrong_total ?? 0,
      exams: r.exams_count ?? 0,
    });
  }

  const out = new Map<string, StudentStrategy>();
  for (const r of students.data) {
    const q = questionGap.get(r.profile_id) ?? new Map<string, number>();
    const m = mockGap.get(r.profile_id) ?? new Map<string, number>();
    const combined = new Map<string, number>();
    for (const subjectId of new Set([...q.keys(), ...m.keys()])) {
      const gap = combineGap({
        questionGap: q.get(subjectId),
        mockGap: m.get(subjectId),
        weight: settings.mock_exams.gap_weight,
      });
      if (gap !== undefined) combined.set(subjectId, gap);
    }
    out.set(r.profile_id, {
      daysToExam: r.exam_date ? daysUntil(r.exam_date) : null,
      mix,
      topicDelayDays: topicDelay.get(r.profile_id) ?? new Map(),
      subjectGap: combined,
      subjectMockWrong: mockWrong.get(r.profile_id) ?? new Map(),
    });
  }
  return out;
});

export async function getStrategyContext(
  studentIds?: string[],
): Promise<ReadonlyMap<string, StudentStrategy>> {
  if (studentIds && studentIds.length === 0) return new Map();
  return fetchStrategyContext(studentIds ? [...studentIds].sort().join(",") : "*");
}

/**
 * Öneriler (08 §2 Parça 4): uyarılar + haftada planlı konular (`v_week_plan_topics`) + süresi
 * geçmemiş reddetmeler + strateji bağlamı (Faz 5c) → `buildSuggestions`. `week` verilmezse
 * İstanbul'a göre bu hafta (K1, K2 ve "Plana ekle" bu haftaya yazar); plan oluşturucu
 * görüntülenen haftayı geçirir.
 */
/** Video süresi → plan dakikası (planner `videoMinutes` ile aynı kural; analytics planner'ı import etmez). */
function minutesOf(durationSeconds: number | null, fallback: number): number {
  if (durationSeconds === null || durationSeconds <= 0) return Math.max(5, fallback);
  return Math.max(5, Math.ceil(durationSeconds / 60));
}

/**
 * Konuya eşli medya (Faz 7, 11 §3.3): öğrencinin atanmış listelerindeki ilk izlenmemiş video ve
 * atanmış kaynaklarındaki ilk bitmemiş test (görünümlerden; `resources` / `videos` modülü kapalı
 * öğrencilerde yok). Anahtar `plannedKey(öğrenci, konu)`.
 */
async function getTopicMedia(
  ids: string[] | undefined,
  linkMinutes: number,
): Promise<Map<string, TopicMedia>> {
  const supabase = await createClient();
  let videoQuery = supabase
    .from("v_student_playlist_videos")
    .select("student_id, topic_id, video_id, title, duration_seconds, playlist_title, sort_order")
    .is("watched_at", null)
    .not("topic_id", "is", null)
    .order("playlist_title")
    .order("sort_order");
  if (ids) videoQuery = videoQuery.in("student_id", ids);
  let sectionQuery = supabase
    .from("v_student_resource_sections")
    .select(
      "student_id, topic_id, section_id, section_title, resource_title, question_count, sort_order",
    )
    .is("done_at", null)
    .not("topic_id", "is", null)
    .order("resource_title")
    .order("sort_order");
  if (ids) sectionQuery = sectionQuery.in("student_id", ids);
  const [videos, sections, disabled] = await Promise.all([
    videoQuery,
    sectionQuery,
    listDisabledModules(),
  ]);
  if (videos.error) throw videos.error;
  if (sections.error) throw sections.error;

  const out = new Map<string, TopicMedia>();
  for (const v of videos.data) {
    if (!v.student_id || !v.topic_id || !v.video_id || disabled.get(v.student_id)?.has("videos"))
      continue;
    const key = plannedKey(v.student_id, v.topic_id);
    const entry = out.get(key) ?? {};
    if (!entry.video) {
      entry.video = {
        videoId: v.video_id,
        title: v.title ?? "",
        minutes: minutesOf(v.duration_seconds, linkMinutes),
      };
      out.set(key, entry);
    }
  }
  for (const sec of sections.data) {
    if (
      !sec.student_id ||
      !sec.topic_id ||
      !sec.section_id ||
      disabled.get(sec.student_id)?.has("resources")
    )
      continue;
    const key = plannedKey(sec.student_id, sec.topic_id);
    const entry = out.get(key) ?? {};
    if (!entry.section) {
      entry.section = {
        sectionId: sec.section_id,
        title: `${sec.resource_title ?? ""} · ${sec.section_title ?? ""}`,
        questionCount: sec.question_count,
      };
      out.set(key, entry);
    }
  }
  return out;
}

export async function getSuggestions(
  studentIds?: string | string[],
  week?: string,
): Promise<Suggestion[]> {
  const ids = typeof studentIds === "string" ? [studentIds] : studentIds;
  if (ids && ids.length === 0) return [];
  const today = toDateKey(todayInIstanbul());
  const weekKey = week ?? toDateKey(weekStart(todayInIstanbul()));
  const supabase = await createClient();

  let plannedQuery = supabase
    .from("v_week_plan_topics")
    .select("student_id, subject_id, topic_id")
    .eq("week_start", weekKey);
  if (ids) plannedQuery = plannedQuery.in("student_id", ids);
  let dismissedQuery = supabase
    .from("suggestion_dismissals")
    .select("student_id, subject_id, topic_id, kind, dismissed_until")
    .gte("dismissed_until", today);
  if (ids) dismissedQuery = dismissedQuery.in("student_id", ids);

  const [alerts, settings, planned, dismissed, strategy] = await Promise.all([
    getTopicAlerts(ids),
    getOrgSettings(),
    plannedQuery,
    dismissedQuery,
    getStrategyContext(ids),
  ]);
  if (planned.error) throw planned.error;
  if (dismissed.error) throw dismissed.error;
  const media = await getTopicMedia(ids, settings.planner.link_minutes);

  const plannedTopicIds = new Set<string>();
  const plannedSubjectIds = new Set<string>();
  for (const r of planned.data) {
    if (!r.student_id) continue;
    if (r.topic_id) plannedTopicIds.add(plannedKey(r.student_id, r.topic_id));
    if (r.subject_id) plannedSubjectIds.add(plannedKey(r.student_id, r.subject_id));
  }
  const dismissedMap = new Map(
    dismissed.data.map((r) => [
      dismissalKey(r.student_id, r.kind, r.subject_id, r.topic_id),
      r.dismissed_until,
    ]),
  );
  const maxExamQuestionCount = Math.max(0, ...alerts.map((a) => a.subject.examQuestionCount ?? 0));

  return buildSuggestions({
    alerts,
    plannedTopicIds,
    plannedSubjectIds,
    dismissed: dismissedMap,
    settings,
    maxExamQuestionCount,
    today,
    strategy,
    media,
  });
}

/**
 * Kurulum olguları (`v_student_setup_facts`, security_invoker) + kapalı modüller; yalnızca koç
 * ekranları ister. Analiz modülü kapalı öğrenciler dışarıda.
 */
export async function getSetupFacts(studentIds?: string | string[]): Promise<SetupFacts[]> {
  const ids = typeof studentIds === "string" ? [studentIds] : studentIds;
  if (ids && ids.length === 0) return [];
  const supabase = await createClient();
  let query = supabase
    .from("v_student_setup_facts")
    .select(
      "student_id, status, created_at, has_schedule, has_active_goal, has_published_plan_week, question_log_count",
    )
    .eq("status", "active");
  if (ids) query = query.in("student_id", ids);
  const [{ data, error }, disabled] = await Promise.all([query, listDisabledModules()]);
  if (error) throw error;
  return data.flatMap((r) =>
    r.student_id && r.created_at && !disabled.get(r.student_id)?.has("analytics")
      ? [
          {
            studentId: r.student_id,
            createdAt: r.created_at,
            hasSchedule: r.has_schedule ?? false,
            hasActiveGoal: r.has_active_goal ?? false,
            hasPublishedPlanWeek: r.has_published_plan_week ?? false,
            questionLogCount: r.question_log_count ?? 0,
            disabledModules: [...(disabled.get(r.student_id) ?? [])],
          },
        ]
      : [],
  );
}

/** Kurulum uyarıları (koç): olgular + `alerts.setup_account_days` → `evaluateSetupAlerts`. */
export async function getSetupAlerts(studentIds?: string | string[]): Promise<SetupAlert[]> {
  const [facts, settings] = await Promise.all([getSetupFacts(studentIds), getOrgSettings()]);
  return evaluateSetupAlerts(facts, settings.alerts, toDateKey(todayInIstanbul()));
}

// Öğrenci düzeyi uyarılar (Faz 8) ------------------------------------------------------------

/** `v_coach_student_overview` satırlarından olgular (koç kendi öğrencileri, owner kurum). */
export async function getStudentAlertFacts(studentId?: string): Promise<StudentAlertFacts[]> {
  const supabase = await createClient();
  let query = supabase
    .from("v_coach_student_overview")
    .select(
      "student_id, status, last_log_date, weekly_target, week_goal_percent, net_delta, plan_percent_last_week, overdue_reviews",
    );
  if (studentId) query = query.eq("student_id", studentId);
  const { data, error } = await query;
  if (error) throw error;
  return data.flatMap((r) =>
    r.student_id && r.status
      ? [
          {
            studentId: r.student_id,
            status: r.status,
            lastLogDate: r.last_log_date,
            weeklyTarget: r.weekly_target === null ? null : Number(r.weekly_target),
            weekGoalPercent: r.week_goal_percent,
            netDelta: r.net_delta === null ? null : Number(r.net_delta),
            planPercentLastWeek: r.plan_percent_last_week,
            overdueReviews: r.overdue_reviews ?? 0,
          },
        ]
      : [],
  );
}

/** Öğrenci düzeyi uyarılar (01 §7; 12 §3.2): olgular + kurum ayarı `student_alerts` → saf kural. */
export async function getStudentAlerts(studentId?: string): Promise<StudentAlert[]> {
  const [facts, settings] = await Promise.all([getStudentAlertFacts(studentId), getOrgSettings()]);
  return evaluateStudentAlerts(facts, settings.student_alerts, toDateKey(todayInIstanbul()));
}
