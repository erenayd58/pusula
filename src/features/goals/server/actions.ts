"use server";

import { ActionError, createAction } from "@/lib/actions/create-action";
import {
  goalPeriodValues,
  setGoalsSchema,
  setStudentTargetsSchema,
  updateTopicTargetSchema,
  weeklyGoalFromTargetSchema,
} from "../schemas";

const NOT_ALLOWED = "Bu işlem için yetkin yok.";

/**
 * Günlük ve haftalık soru hedefi (koç/owner). Dönem başına tek aktif hedef: varsa güncellenir,
 * yoksa eklenir; boş bırakılan dönemin hedefi pasife alınır. RLS koçu kendi öğrencisiyle sınırlar.
 */
export const setGoals = createAction({
  name: "setGoals",
  schema: setGoalsSchema,
  roles: ["coach", "owner"],
  revalidate: ["/coach/students", "/student/today"],
  handler: async (input, ctx) => {
    const { data: existing, error: readError } = await ctx.supabase
      .from("goals")
      .select("id, period")
      .eq("student_id", input.studentId)
      .eq("is_active", true);
    if (readError) throw readError;
    const byPeriod = new Map(existing.map((g) => [g.period, g.id]));

    for (const period of goalPeriodValues) {
      const target = input[period];
      const id = byPeriod.get(period);
      if (target === null) {
        if (!id) continue;
        const { error } = await ctx.supabase
          .from("goals")
          .update({ is_active: false })
          .eq("id", id);
        if (error) throw error;
      } else if (id) {
        const { error } = await ctx.supabase
          .from("goals")
          .update({ target_value: target })
          .eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await ctx.supabase.from("goals").insert({
          student_id: input.studentId,
          created_by: ctx.userId,
          period,
          target_value: target,
        });
        if (error) {
          if (error.code === "42501") throw new ActionError(NOT_ALLOWED);
          throw error;
        }
      }
    }
    return { daily: input.daily, weekly: input.weekly };
  },
});

// Faz 5b: hedef ve geri planlama (09 §2 Parça 2) -----------------------------------------------

const TARGET_PATHS = [
  "/student/today",
  "/student/topics",
  "/coach/students",
  "/coach/plans",
] as const;

/**
 * Hedef kurma / yeniden üretme: `set_student_targets` RPC (tek transaction; `is_coach_of`; ders ve
 * konu şablonda değilse `invalid_target`). Sıfır soru verilen ders payload'a girmez (silinir).
 * Bitirme tarihi sınav tarihinden sonra olamaz (form varsayılanı sınav − N hafta, karar B16).
 */
export const setStudentTargets = createAction({
  name: "setStudentTargets",
  schema: setStudentTargetsSchema,
  roles: ["coach", "owner"],
  revalidate: TARGET_PATHS,
  handler: async (input, ctx) => {
    const { data: student, error: readError } = await ctx.supabase
      .from("students")
      .select("exam_date")
      .eq("profile_id", input.studentId)
      .maybeSingle();
    if (readError) throw readError;
    if (!student) throw new ActionError(NOT_ALLOWED);
    if (student.exam_date && input.topicsFinishBy > student.exam_date) {
      throw new ActionError("Bitirme tarihi sınav tarihinden sonra olamaz.", {
        topicsFinishBy: ["Bitirme tarihi sınav tarihinden sonra olamaz."],
      });
    }

    const { data, error } = await ctx.supabase.rpc("set_student_targets", {
      p_student_id: input.studentId,
      p_topics_finish_by: input.topicsFinishBy,
      p_starts_on: input.startsOn,
      p_subject_targets: input.subjects
        .filter((s) => s.questions > 0)
        .map((s) => ({ subject_id: s.subjectId, questions: s.questions })),
      p_topic_targets: input.topics.map((t) => ({ topic_id: t.topicId, target_on: t.targetOn })),
    });
    if (error) {
      if (error.code === "42501") throw new ActionError(NOT_ALLOWED);
      if (error.message.includes("invalid_target")) {
        throw new ActionError("Bir ders ya da konu öğrencinin şablonunda değil; sayfayı yenile.");
      }
      throw error;
    }
    const result = (data ?? {}) as { subjects?: number; topics?: number };
    return { subjects: result.subjects ?? 0, topics: result.topics ?? 0 };
  },
});

/** Tek konunun hedef tarihi: RLS ile satır güncellemesi (koç kendi öğrencisi). */
export const updateTopicTarget = createAction({
  name: "updateTopicTarget",
  schema: updateTopicTargetSchema,
  roles: ["coach", "owner"],
  revalidate: TARGET_PATHS,
  handler: async (input, ctx) => {
    const { data, error } = await ctx.supabase
      .from("student_topic_targets")
      .update({ target_on: input.targetOn })
      .eq("student_id", input.studentId)
      .eq("topic_id", input.topicId)
      .select("topic_id");
    if (error) {
      if (error.code === "42501") throw new ActionError(NOT_ALLOWED);
      throw error;
    }
    if (data.length === 0) throw new ActionError("Konu hedefi bulunamadı; sayfayı yenile.");
    return { topicId: input.topicId, targetOn: input.targetOn };
  },
});

/**
 * "Haftalık hedefi buna göre öner" → "Uygula" (karar B13): otomatik değil, koçun onayladığı
 * sayı mevcut `setGoals` yoluyla yazılır (günlük hedef korunur).
 */
export const applyWeeklyGoalSuggestion = createAction({
  name: "applyWeeklyGoalSuggestion",
  schema: weeklyGoalFromTargetSchema,
  roles: ["coach", "owner"],
  revalidate: TARGET_PATHS,
  handler: async (input, ctx) => {
    const { data, error } = await ctx.supabase
      .from("goals")
      .select("target_value")
      .eq("student_id", input.studentId)
      .eq("is_active", true)
      .eq("period", "daily")
      .maybeSingle();
    if (error) throw error;
    const daily = data ? Number(data.target_value) : null;
    const result = await setGoals({ studentId: input.studentId, daily, weekly: input.weekly });
    if (!result.ok) throw new ActionError(result.error);
    return { weekly: input.weekly };
  },
});
