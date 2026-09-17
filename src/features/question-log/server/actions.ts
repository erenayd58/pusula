"use server";

import { getActiveGoals } from "@/features/goals";
import { ActionError, createAction } from "@/lib/actions/create-action";
import { toDateKey, todayInIstanbul } from "@/lib/dates";
import type { ServerSupabaseClient } from "@/lib/supabase/server";
import {
  createQuestionLogSchema,
  deleteQuestionLogSchema,
  updateQuestionLogSchema,
} from "../schemas";

const NOT_ALLOWED = "Bu işlem için yetkin yok.";
const NOT_FOUND = "Kayıt bulunamadı; sayfayı yenile.";
const PATHS = ["/student/today", "/student/logs", "/student/topics", "/coach/students"] as const;

/** Öğrenci yalnızca kendi adına yazar; koç/owner için RLS öğrencisiyle sınırlar. */
function assertOwn(role: string, userId: string, studentId: string) {
  if (role === "student" && studentId !== userId) throw new ActionError(NOT_ALLOWED);
}

/** Toast için: bugünkü toplam ve günlük hedef ("Bugün 34 soru kaldı"). */
async function todayStatus(supabase: ServerSupabaseClient, studentId: string) {
  const [{ data, error }, goals] = await Promise.all([
    supabase
      .from("v_student_daily_summary")
      .select("questions")
      .eq("student_id", studentId)
      .eq("day", toDateKey(todayInIstanbul()))
      .maybeSingle(),
    getActiveGoals(studentId),
  ]);
  if (error) throw error;
  return { todayTotal: data?.questions ?? 0, dailyTarget: goals.daily };
}

/**
 * Yeni soru kaydı. Tarih istemciden alınmaz; İstanbul bugünü sunucuda atanır
 * (veritabanı varsayılanıyla aynı kural). total = doğru + yanlış + boş.
 */
export const createQuestionLog = createAction({
  name: "createQuestionLog",
  schema: createQuestionLogSchema,
  roles: ["student", "coach", "owner"],
  revalidate: PATHS,
  handler: async (input, ctx) => {
    assertOwn(ctx.profile.role, ctx.userId, input.studentId);
    const { data, error } = await ctx.supabase
      .from("question_logs")
      .insert({
        student_id: input.studentId,
        log_date: toDateKey(todayInIstanbul()),
        subject_id: input.subjectId,
        topic_id: input.topicId,
        total_count: input.correct + input.wrong + input.blank,
        correct_count: input.correct,
        wrong_count: input.wrong,
        blank_count: input.blank,
        duration_minutes: input.durationMinutes,
      })
      .select("id")
      .single();
    if (error) {
      if (error.code === "42501") throw new ActionError(NOT_ALLOWED);
      throw error;
    }
    return { id: data.id, ...(await todayStatus(ctx.supabase, input.studentId)) };
  },
});

/** Kayıt düzenleme: tarih değişebilir (gelecek olamaz; zod + veritabanı check'i). */
export const updateQuestionLog = createAction({
  name: "updateQuestionLog",
  schema: updateQuestionLogSchema,
  roles: ["student", "coach", "owner"],
  revalidate: PATHS,
  handler: async (input, ctx) => {
    assertOwn(ctx.profile.role, ctx.userId, input.studentId);
    const { data, error } = await ctx.supabase
      .from("question_logs")
      .update({
        log_date: input.logDate,
        subject_id: input.subjectId,
        topic_id: input.topicId,
        total_count: input.correct + input.wrong + input.blank,
        correct_count: input.correct,
        wrong_count: input.wrong,
        blank_count: input.blank,
        duration_minutes: input.durationMinutes,
      })
      .eq("id", input.id)
      .eq("student_id", input.studentId)
      .select("id");
    if (error) {
      if (error.code === "42501") throw new ActionError(NOT_ALLOWED);
      throw error;
    }
    // RLS sessizce filtrelerse 0 satır döner.
    if (data.length === 0) throw new ActionError(NOT_FOUND);
    return { id: input.id, ...(await todayStatus(ctx.supabase, input.studentId)) };
  },
});

export const deleteQuestionLog = createAction({
  name: "deleteQuestionLog",
  schema: deleteQuestionLogSchema,
  roles: ["student", "coach", "owner"],
  revalidate: PATHS,
  handler: async (input, ctx) => {
    const { data, error } = await ctx.supabase
      .from("question_logs")
      .delete()
      .eq("id", input.id)
      .select("id");
    if (error) throw error;
    if (data.length === 0) throw new ActionError(NOT_FOUND);
    return { id: input.id };
  },
});
