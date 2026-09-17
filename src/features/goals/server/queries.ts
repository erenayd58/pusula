import "server-only";

import { toDateKey, todayInIstanbul, weekStart } from "@/lib/dates";
import { createClient } from "@/lib/supabase/server";

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
