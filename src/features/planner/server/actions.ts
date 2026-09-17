"use server";

import { ActionError, createAction } from "@/lib/actions/create-action";
import type { ServerSupabaseClient } from "@/lib/supabase/server";
import { taskTitle } from "../lib/task-title";
import {
  addPlanItemsSchema,
  coachMessageSchema,
  copyPlanSchema,
  itemNoteSchema,
  movePlanItemSchema,
  planItemIdSchema,
  planWeekSchema,
  reflectionSchema,
  studentItemSchema,
  updatePlanItemSchema,
} from "../schemas";

const NOT_ALLOWED = "Bu işlem için yetkin yok.";
const NOT_FOUND = "Kayıt bulunamadı; sayfayı yenile.";
const COACH = ["coach", "owner"] as const;
const STUDENT_ROLES = ["student", "coach", "owner"] as const;
const PATHS = ["/student/plan", "/student/today", "/coach/students", "/coach/plans"] as const;

function rethrow(error: { code?: string; message?: string }): never {
  if (error.code === "42501") throw new ActionError(NOT_ALLOWED);
  throw error;
}

/** Plan yoksa taslak açar (tek tablo, `on conflict do nothing`), kimliğini döner. */
async function ensurePlan(
  supabase: ServerSupabaseClient,
  userId: string,
  studentId: string,
  weekStart: string,
): Promise<{ id: string; status: "draft" | "published" }> {
  const { error: insertError } = await supabase
    .from("weekly_plans")
    .upsert(
      { student_id: studentId, week_start: weekStart, created_by: userId },
      { onConflict: "student_id,week_start", ignoreDuplicates: true },
    );
  if (insertError) rethrow(insertError);
  const { data, error } = await supabase
    .from("weekly_plans")
    .select("id, status")
    .eq("student_id", studentId)
    .eq("week_start", weekStart)
    .maybeSingle();
  if (error) rethrow(error);
  if (!data) throw new ActionError(NOT_ALLOWED);
  return data;
}

/** Boş başlık için ders/konu adlarını okuyup otomatik başlık üretir. */
async function resolveTitle(
  supabase: ServerSupabaseClient,
  input: {
    title: string;
    kind: "topic_study" | "questions" | "review" | "link" | "custom";
    subjectId: string | null;
    topicId: string | null;
    targetValue: number | null;
    targetUnit: "questions" | "minutes" | null;
  },
): Promise<string> {
  if (input.title.trim() !== "") return input.title.trim();
  const [subject, topic] = await Promise.all([
    input.subjectId
      ? supabase.from("subjects").select("name").eq("id", input.subjectId).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    input.topicId
      ? supabase.from("topics").select("name").eq("id", input.topicId).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ]);
  if (subject.error) throw subject.error;
  if (topic.error) throw topic.error;
  return taskTitle({
    kind: input.kind,
    subjectName: subject.data?.name ?? null,
    topicName: topic.data?.name ?? null,
    targetValue: input.targetValue,
    targetUnit: input.targetUnit,
  });
}

// Koç eylemleri ----------------------------------------------------------------------

/** Taslak aç (boş hafta → plan satırı). */
export const ensureDraft = createAction({
  name: "ensureDraft",
  schema: planWeekSchema,
  roles: COACH,
  revalidate: PATHS,
  handler: async (input, ctx) =>
    ensurePlan(ctx.supabase, ctx.userId, input.studentId, input.weekStart),
});

/** Görev ekle: seçili her gün için bir satır (tek insert, atomik); gün sırasının sonuna. */
export const addPlanItems = createAction({
  name: "addPlanItems",
  schema: addPlanItemsSchema,
  roles: COACH,
  revalidate: PATHS,
  handler: async (input, ctx) => {
    const plan = await ensurePlan(ctx.supabase, ctx.userId, input.studentId, input.weekStart);
    const title = await resolveTitle(ctx.supabase, input);
    const { data: existing, error: countError } = await ctx.supabase
      .from("plan_items")
      .select("day_of_week, sort_order")
      .eq("plan_id", plan.id);
    if (countError) rethrow(countError);
    const nextOrder = new Map<string, number>();
    for (const r of existing) {
      const k = String(r.day_of_week);
      nextOrder.set(k, Math.max(nextOrder.get(k) ?? 0, r.sort_order + 1));
    }
    const days = [...new Set(input.days)];
    const rows = days.map((day) => {
      const k = String(day);
      const order = nextOrder.get(k) ?? 0;
      nextOrder.set(k, order + 1);
      return {
        plan_id: plan.id,
        day_of_week: day,
        sort_order: order,
        kind: input.kind,
        title,
        subject_id: input.subjectId,
        topic_id: input.topicId,
        url: input.kind === "link" ? input.url : null,
        target_value: input.targetValue,
        target_unit: input.targetUnit,
        estimated_minutes: input.estimatedMinutes,
      };
    });
    const { data, error } = await ctx.supabase.from("plan_items").insert(rows).select("id");
    if (error) rethrow(error);
    return { planId: plan.id, ids: data.map((d) => d.id), title };
  },
});

export const updatePlanItem = createAction({
  name: "updatePlanItem",
  schema: updatePlanItemSchema,
  roles: COACH,
  revalidate: PATHS,
  handler: async (input, ctx) => {
    const title = await resolveTitle(ctx.supabase, input);
    const { data, error } = await ctx.supabase
      .from("plan_items")
      .update({
        kind: input.kind,
        title,
        subject_id: input.subjectId,
        topic_id: input.topicId,
        url: input.kind === "link" ? input.url : null,
        target_value: input.targetValue,
        target_unit: input.targetUnit,
        estimated_minutes: input.estimatedMinutes,
      })
      .eq("id", input.id)
      .select("id");
    if (error) rethrow(error);
    if (data.length === 0) throw new ActionError(NOT_FOUND);
    return { id: input.id, title };
  },
});

export const deletePlanItem = createAction({
  name: "deletePlanItem",
  schema: planItemIdSchema,
  roles: COACH,
  revalidate: PATHS,
  handler: async (input, ctx) => {
    const { data, error } = await ctx.supabase
      .from("plan_items")
      .delete()
      .eq("id", input.id)
      .select("id");
    if (error) rethrow(error);
    if (data.length === 0) throw new ActionError(NOT_FOUND);
    return { id: input.id };
  },
});

/** Güne/"bu hafta içinde"ye taşı ve sırala (RPC, security invoker). */
export const movePlanItem = createAction({
  name: "movePlanItem",
  schema: movePlanItemSchema,
  roles: COACH,
  revalidate: PATHS,
  handler: async (input, ctx) => {
    const { error } = await ctx.supabase.rpc("move_plan_item", {
      p_item_id: input.id,
      // Üretilen RPC tipi null'ı ifade etmiyor; PostgREST JSON null'ı smallint null olarak geçirir.
      p_day: input.dayOfWeek as number,
      p_index: input.index,
    });
    if (error) rethrow(error);
    return { id: input.id };
  },
});

/** Yayınla: durum + zaman. Yayınlanmış plan sonra da canlı düzenlenir (karar A4). */
export const publishPlan = createAction({
  name: "publishPlan",
  schema: planWeekSchema,
  roles: COACH,
  revalidate: PATHS,
  handler: async (input, ctx) => {
    const plan = await ensurePlan(ctx.supabase, ctx.userId, input.studentId, input.weekStart);
    const { data, error } = await ctx.supabase
      .from("weekly_plans")
      .update({ status: "published", published_at: new Date().toISOString() })
      .eq("id", plan.id)
      .select("id");
    if (error) rethrow(error);
    if (data.length === 0) throw new ActionError(NOT_FOUND);
    return { planId: plan.id };
  },
});

export const setCoachMessage = createAction({
  name: "setCoachMessage",
  schema: coachMessageSchema,
  roles: COACH,
  revalidate: PATHS,
  handler: async (input, ctx) => {
    const { data, error } = await ctx.supabase
      .from("weekly_plans")
      .update({ coach_message: input.message })
      .eq("id", input.planId)
      .select("id");
    if (error) rethrow(error);
    if (data.length === 0) throw new ActionError(NOT_FOUND);
    return { planId: input.planId };
  },
});

export type CopyResult = {
  copied: { student_id: string; plan_id: string; existing_items: number; added_items: number }[];
};

/** Başka öğrencilere kopyala / geçen haftayı kopyala / tamamlanmayanları aktar (tek RPC). */
export const copyPlan = createAction({
  name: "copyPlan",
  schema: copyPlanSchema,
  roles: COACH,
  revalidate: PATHS,
  handler: async (input, ctx) => {
    const { data, error } = await ctx.supabase.rpc("copy_weekly_plan", {
      p_source_plan_id: input.sourcePlanId,
      p_target_student_ids: input.targetStudentIds,
      p_week_start: input.weekStart,
      p_only_incomplete: input.onlyIncomplete,
    });
    if (error) rethrow(error);
    return data as CopyResult;
  },
});

// Öğrenci eylemleri (RPC; yetki veritabanında) -------------------------------------------

/** Tek dokunuşla tamamla (soru türü hızlı kayıt sheet'inden `createQuestionLog` ile gelir). */
export const completeItem = createAction({
  name: "completeItem",
  schema: studentItemSchema,
  roles: STUDENT_ROLES,
  revalidate: PATHS,
  handler: async (input, ctx) => {
    const { error } = await ctx.supabase.rpc("complete_plan_item", { p_item_id: input.id });
    if (error) rethrow(error);
    return { id: input.id };
  },
});

export const uncompleteItem = createAction({
  name: "uncompleteItem",
  schema: studentItemSchema,
  roles: STUDENT_ROLES,
  revalidate: PATHS,
  handler: async (input, ctx) => {
    const { data, error } = await ctx.supabase.rpc("uncomplete_plan_item", { p_item_id: input.id });
    if (error) rethrow(error);
    const unlinked = (data as { unlinked_logs?: number } | null)?.unlinked_logs ?? 0;
    return { id: input.id, unlinkedLogs: unlinked };
  },
});

export const postponeItem = createAction({
  name: "postponeItem",
  schema: studentItemSchema,
  roles: STUDENT_ROLES,
  revalidate: PATHS,
  handler: async (input, ctx) => {
    const { data, error } = await ctx.supabase.rpc("postpone_plan_item", { p_item_id: input.id });
    if (error) {
      if (error.message?.includes("cannot_postpone")) {
        throw new ActionError("Bu görev ertelenemez: zaten ertelendi ya da günü yok.");
      }
      rethrow(error);
    }
    const day = (data as { day_of_week?: number | null } | null)?.day_of_week ?? null;
    return { id: input.id, dayOfWeek: day };
  },
});

export const setItemNote = createAction({
  name: "setItemNote",
  schema: itemNoteSchema,
  roles: STUDENT_ROLES,
  revalidate: PATHS,
  handler: async (input, ctx) => {
    const { error } = await ctx.supabase.rpc("set_plan_item_note", {
      p_item_id: input.id,
      p_note: input.note,
    });
    if (error) rethrow(error);
    return { id: input.id };
  },
});

export const setReflection = createAction({
  name: "setReflection",
  schema: reflectionSchema,
  roles: STUDENT_ROLES,
  revalidate: PATHS,
  handler: async (input, ctx) => {
    const { error } = await ctx.supabase.rpc("set_plan_reflection", {
      p_plan_id: input.planId,
      p_text: input.text,
    });
    if (error) {
      if (error.message?.includes("week_closed")) {
        throw new ActionError("Bu hafta kapandı; değerlendirme artık değiştirilemez.");
      }
      rethrow(error);
    }
    return { planId: input.planId };
  },
});
