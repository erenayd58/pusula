import "server-only";

import { getOrgSettings } from "@/features/core";
import { getTypicalWeekAvailability } from "@/features/schedule";
import { isDone } from "@/features/topics";
import { toDateKey, todayInIstanbul, weekStart } from "@/lib/dates";
import { createClient } from "@/lib/supabase/server";
import type { StudentTargets, TopicTargetRow } from "../types";

/** Aktif hedefler (dönem başına en fazla bir). Yoksa alan null. */
export type ActiveGoals = { daily: number | null; weekly: number | null };

export async function getActiveGoals(studentId: string): Promise<ActiveGoals> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("goals")
    .select("period, target_value")
    .eq("student_id", studentId)
    .eq("is_active", true);
  if (error) throw error;
  const goals: ActiveGoals = { daily: null, weekly: null };
  for (const g of data) goals[g.period] = Number(g.target_value);
  return goals;
}

/** Bugün ve bu haftanın çözülen sorusu + hedefler (halka ve koç özeti; İstanbul günü/haftası). */
export type GoalProgress = {
  todayQuestions: number;
  weekQuestions: number;
  goals: ActiveGoals;
};

export async function getGoalProgress(studentId: string, now = new Date()): Promise<GoalProgress> {
  const supabase = await createClient();
  const todayKey = toDateKey(todayInIstanbul(now));
  const weekKey = toDateKey(weekStart(now));
  const [goals, { data, error }] = await Promise.all([
    getActiveGoals(studentId),
    supabase
      .from("v_student_daily_summary")
      .select("day, questions")
      .eq("student_id", studentId)
      .gte("day", weekKey),
  ]);
  if (error) throw error;
  let todayQuestions = 0;
  let weekQuestions = 0;
  for (const row of data) {
    const q = row.questions ?? 0;
    weekQuestions += q;
    if (row.day === todayKey) todayQuestions = q;
  }
  return { todayQuestions, weekQuestions, goals };
}

// Faz 5b: hedef ve gidişat (09 §2 Parça 2) ----------------------------------------------------

/**
 * "Hedef" sekmesinin verisi: `students` hedef kolonları + `v_student_subject_targets` (ders
 * satırları) + `v_student_pace_facts` (konu satırları) + bitmemiş konuların tahmini süresi.
 * RLS: koç kendi öğrencisi, owner kurumu. Şablon atanmamışsa null.
 */
export async function getStudentTargets(studentId: string): Promise<StudentTargets | null> {
  const supabase = await createClient();
  const [{ data: student, error }, settings] = await Promise.all([
    supabase
      .from("students")
      .select("exam_date, topics_finish_by, target_starts_on, curriculum_template_id")
      .eq("profile_id", studentId)
      .maybeSingle(),
    getOrgSettings(),
  ]);
  if (error) throw error;
  if (!student?.curriculum_template_id) return null;

  const [subjectRows, topicRows] = await Promise.all([
    supabase
      .from("v_student_subject_targets")
      .select(
        "subject_id, subject_name, subject_short_name, subject_color, subject_sort_order, exam_question_count, questions_target, questions_done, topics_total, topics_done, topics_expected",
      )
      .eq("student_id", studentId)
      .order("subject_sort_order")
      .then(({ data, error }) => {
        if (error) throw error;
        return data;
      }),
    supabase
      .from("v_student_pace_facts")
      .select(
        "subject_id, subject_sort_order, topic_id, topic_name, topic_sort_order, status, completed_at, target_on, school_finish_on",
      )
      .eq("student_id", studentId)
      .order("subject_sort_order")
      .order("topic_sort_order")
      .then(({ data, error }) => {
        if (error) throw error;
        return data;
      }),
  ]);

  const topics: TopicTargetRow[] = topicRows.flatMap((r) =>
    r.topic_id && r.subject_id && r.topic_name && r.status
      ? [
          {
            topicId: r.topic_id,
            subjectId: r.subject_id,
            name: r.topic_name,
            sortOrder: r.topic_sort_order ?? 0,
            subjectSortOrder: r.subject_sort_order ?? 0,
            status: r.status,
            done: isDone(r.status),
            completedAt: r.completed_at,
            targetOn: r.target_on,
            schoolFinishOn: r.school_finish_on,
          },
        ]
      : [],
  );

  // Bitmemiş konuların tahmini süresi (topics.estimated_minutes; boşsa kurum varsayılanı).
  const pendingIds = topics.filter((t) => !t.done).map((t) => t.topicId);
  let remainingTopicMinutes = 0;
  if (pendingIds.length > 0) {
    const { data: est, error: estError } = await supabase
      .from("topics")
      .select("id, estimated_minutes")
      .in("id", pendingIds);
    if (estError) throw estError;
    const byId = new Map(est.map((t) => [t.id, t.estimated_minutes]));
    remainingTopicMinutes = pendingIds.reduce(
      (sum, id) => sum + (byId.get(id) ?? settings.strategy.topic_minutes_default),
      0,
    );
  }

  return {
    studentId,
    examDate: student.exam_date,
    topicsFinishBy: student.topics_finish_by,
    targetStartsOn: student.target_starts_on,
    subjects: subjectRows.flatMap((r) =>
      r.subject_id && r.subject_name && r.subject_short_name && r.subject_color
        ? [
            {
              subjectId: r.subject_id,
              name: r.subject_name,
              shortName: r.subject_short_name,
              color: r.subject_color,
              sortOrder: r.subject_sort_order ?? 0,
              examQuestionCount: r.exam_question_count,
              questions: r.questions_target,
              questionsDone: r.questions_done ?? 0,
              topicsTotal: r.topics_total ?? 0,
              topicsDone: r.topics_done ?? 0,
              topicsExpected: r.topics_expected ?? 0,
            },
          ]
        : [],
    ),
    topics,
    remainingTopicMinutes,
  };
}

/**
 * Gerçekçilik hesabının müsait süresi: istisnasız tipik hafta (schedule) × `day_capacity_ratio`
 * (planner ayarı). Dakika.
 */
export async function getWeeklyAvailableMinutes(studentId: string): Promise<number> {
  const [days, settings] = await Promise.all([
    getTypicalWeekAvailability(studentId),
    getOrgSettings(),
  ]);
  const total = days.reduce((sum, d) => sum + d.availableMinutes, 0);
  return Math.round(total * settings.planner.day_capacity_ratio);
}
