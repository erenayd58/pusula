import "server-only";

import { cache } from "react";
import { getOrgSettings } from "@/features/core";
import { toDateKey, todayInIstanbul, weekStart } from "@/lib/dates";
import { createClient } from "@/lib/supabase/server";
import { alertThresholds, evaluateSetupAlerts, evaluateTopicAlerts } from "../lib/alerts";
import { buildSuggestions, dismissalKey, plannedKey, type Suggestion } from "../lib/suggestions";
import type { SetupAlert, SetupFacts, TopicAlert, TopicAlertFacts } from "../types";

/**
 * Uyarı okuma sorguları. `v_topic_alert_facts` security_invoker: koç kendi öğrencilerini, owner
 * kurumu, öğrenci kendini görür; `studentIds` verilmezse görünen tüm öğrenciler (K1 tek sorgu).
 * Karar TypeScript'te (`evaluateTopicAlerts`), eşikler kurum ayarından.
 */

const FACT_SELECT =
  "student_id, organization_id, coach_id, subject_id, subject_name, subject_short_name, subject_color, subject_sort_order, exam_question_count, topic_id, topic_name, topic_sort_order, status, status_changed_at, completed_at, last_reviewed_at, questions_window, correct_window, last_topic_log_date, subject_last_log_date, student_first_log_date, is_next_topic, school_finish_on" as const;

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

/**
 * Öneriler (08 §2 Parça 4): uyarılar + haftada planlı konular (`v_week_plan_topics`) + süresi
 * geçmemiş reddetmeler → `buildSuggestions`. `week` verilmezse İstanbul'a göre bu hafta (K1, K2
 * ve "Plana ekle" bu haftaya yazar); plan oluşturucu görüntülenen haftayı geçirir.
 */
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

  const [alerts, settings, planned, dismissed] = await Promise.all([
    getTopicAlerts(ids),
    getOrgSettings(),
    plannedQuery,
    dismissedQuery,
  ]);
  if (planned.error) throw planned.error;
  if (dismissed.error) throw dismissed.error;

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
