"use server";

import { ActionError, createAction } from "@/lib/actions/create-action";
import { isDone } from "../lib/completion";
import {
  addTopicSchema,
  moveTopicSchema,
  renameTopicSchema,
  setTopicProgressSchema,
  setTopicSchoolDatesSchema,
  topicIdSchema,
} from "../schemas";

const NOT_ALLOWED = "Bu işlem için yetkin yok.";
const TEMPLATE_PATHS = ["/coach/templates", "/student/topics", "/coach/students"] as const;

/**
 * Konu durumu + güven puanı (öğrenci kendisi; koç/owner öğrencisi için). Satır tembel oluşur
 * (upsert). `completed_at`: durum ilk kez tamamlandı/oturdu olduğunda atanır, geri alınınca
 * temizlenir. Tekrar alanları (`next_review_at`) Faz 6'da tekrar modülüyle gelir.
 */
export const setTopicProgress = createAction({
  name: "setTopicProgress",
  schema: setTopicProgressSchema,
  roles: ["student", "coach", "owner"],
  revalidate: ["/student/topics", "/student/today", "/coach/students"],
  handler: async (input, ctx) => {
    if (ctx.profile.role === "student" && input.studentId !== ctx.userId) {
      throw new ActionError(NOT_ALLOWED);
    }

    const { data: existing, error: readError } = await ctx.supabase
      .from("student_topic_progress")
      .select("completed_at")
      .eq("student_id", input.studentId)
      .eq("topic_id", input.topicId)
      .maybeSingle();
    if (readError) throw readError;

    const completedAt = isDone(input.status)
      ? (existing?.completed_at ?? new Date().toISOString())
      : null;

    const { error } = await ctx.supabase.from("student_topic_progress").upsert(
      {
        student_id: input.studentId,
        topic_id: input.topicId,
        status: input.status,
        confidence: input.confidence,
        completed_at: completedAt,
      },
      { onConflict: "student_id,topic_id" },
    );
    if (error) {
      if (error.code === "42501") throw new ActionError(NOT_ALLOWED);
      throw error;
    }
    return { status: input.status, confidence: input.confidence, completedAt };
  },
});

/** Dersin sonuna ünite düzeyi konu ekler (max sort_order + 1). */
export const addTopic = createAction({
  name: "addTopic",
  schema: addTopicSchema,
  roles: ["coach", "owner"],
  revalidate: TEMPLATE_PATHS,
  handler: async (input, ctx) => {
    const { data: last, error: readError } = await ctx.supabase
      .from("topics")
      .select("sort_order")
      .eq("subject_id", input.subjectId)
      .is("parent_id", null)
      .order("sort_order", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (readError) throw readError;

    const { data, error } = await ctx.supabase
      .from("topics")
      .insert({
        subject_id: input.subjectId,
        name: input.name,
        sort_order: (last?.sort_order ?? 0) + 1,
      })
      .select("id")
      .single();
    if (error) {
      if (error.code === "42501") throw new ActionError(NOT_ALLOWED);
      throw error;
    }
    return { topicId: data.id };
  },
});

export const renameTopic = createAction({
  name: "renameTopic",
  schema: renameTopicSchema,
  roles: ["coach", "owner"],
  revalidate: TEMPLATE_PATHS,
  handler: async (input, ctx) => {
    const { data, error } = await ctx.supabase
      .from("topics")
      .update({ name: input.name })
      .eq("id", input.topicId)
      .select("id");
    if (error) throw error;
    // RLS sessizce filtrelerse 0 satır döner.
    if (data.length === 0) throw new ActionError(NOT_ALLOWED);
    return { topicId: input.topicId };
  },
});

/** Konuyu ve (cascade ile) öğrenci ilerlemesini siler. Onay metni arayüzde (sayı sorgudan). */
export const deleteTopic = createAction({
  name: "deleteTopic",
  schema: topicIdSchema,
  roles: ["coach", "owner"],
  revalidate: TEMPLATE_PATHS,
  handler: async (input, ctx) => {
    const { data, error } = await ctx.supabase
      .from("topics")
      .delete()
      .eq("id", input.topicId)
      .select("id");
    if (error) throw error;
    if (data.length === 0) throw new ActionError(NOT_ALLOWED);
    return { topicId: input.topicId };
  },
});

/**
 * Okul takvimi (Faz 5a): `set_topic_school_dates(p_rows)` RPC'si security invoker, tek UPDATE →
 * atomik; RLS'nin filtrelediği satır varsa RPC 42501 verir ve hiçbir satır yazılmaz. Tek satır
 * düzenlemesi de "Sıradan dağıt" da bu eylemle. Uyarılar için `/coach/students` da tazelenir.
 */
export const setTopicSchoolDates = createAction({
  name: "setTopicSchoolDates",
  schema: setTopicSchoolDatesSchema,
  roles: ["coach", "owner"],
  revalidate: TEMPLATE_PATHS,
  handler: async (input, ctx) => {
    const { data, error } = await ctx.supabase.rpc("set_topic_school_dates", {
      p_rows: input.rows.map((r) => ({ topic_id: r.topicId, on: r.schoolFinishOn })),
    });
    if (error) {
      if (error.code === "42501") throw new ActionError(NOT_ALLOWED);
      throw error;
    }
    if ((data ?? 0) < input.rows.length) throw new ActionError(NOT_ALLOWED);
    return { updated: data ?? 0 };
  },
});

/** Kardeşleri arasında bir yukarı/aşağı (move_topic RPC; eşit sort_order'da deterministik). */
export const moveTopic = createAction({
  name: "moveTopic",
  schema: moveTopicSchema,
  roles: ["coach", "owner"],
  revalidate: TEMPLATE_PATHS,
  handler: async (input, ctx) => {
    const { error } = await ctx.supabase.rpc("move_topic", {
      p_topic_id: input.topicId,
      p_direction: input.direction,
    });
    if (error) {
      if (error.code === "42501") throw new ActionError(NOT_ALLOWED);
      throw error;
    }
    return { topicId: input.topicId };
  },
});
