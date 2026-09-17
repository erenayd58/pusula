import "server-only";

import { getOrgSettings } from "@/features/core";
import { toDateKey, todayInIstanbul, weekStart } from "@/lib/dates";
import { createClient } from "@/lib/supabase/server";
import { evaluateTopicAlerts } from "../lib/alerts";
import { buildSuggestions, dismissalKey, plannedKey, type Suggestion } from "../lib/suggestions";
import type { TopicAlert, TopicAlertFacts } from "../types";

/**
 * Uyarı okuma sorguları. `v_topic_alert_facts` security_invoker: koç kendi öğrencilerini, owner
 * kurumu, öğrenci kendini görür; `studentIds` verilmezse görünen tüm öğrenciler (K1 tek sorgu).
 * Karar TypeScript'te (`evaluateTopicAlerts`), eşikler kurum ayarından.
 */

const FACT_SELECT =
  "student_id, organization_id, coach_id, subject_id, subject_name, subject_short_name, subject_color, subject_sort_order, exam_question_count, topic_id, topic_name, topic_sort_order, status, status_changed_at, completed_at, last_reviewed_at, questions_window, correct_window, last_topic_log_date, subject_last_log_date, student_first_log_date, is_next_topic" as const;

/** Analiz modülü kapatılan öğrenciler (student_modules); K1 tek sorguda onları dışarıda bırakır. */
async function listAnalyticsDisabled(): Promise<Set<string>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("student_modules")
    .select("student_id")
    .eq("module_id", "analytics")
    .eq("enabled", false);
  if (error) throw error;
  return new Set(data.map((r) => r.student_id));
}

export async function getTopicAlertFacts(studentIds?: string[]): Promise<TopicAlertFacts[]> {
  if (studentIds && studentIds.length === 0) return [];
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
          },
        ]
      : [],
  );
}

/** Olgular + kurum eşikleri → uyarılar (öncelik sırasında). Tek öğrenci ya da liste. */
export async function getTopicAlerts(studentIds?: string | string[]): Promise<TopicAlert[]> {
  const ids = typeof studentIds === "string" ? [studentIds] : studentIds;
  const [facts, settings] = await Promise.all([getTopicAlertFacts(ids), getOrgSettings()]);
  return evaluateTopicAlerts(facts, settings.alerts, toDateKey(todayInIstanbul()));
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
