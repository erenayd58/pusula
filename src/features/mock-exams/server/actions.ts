"use server";

import { ActionError, createAction } from "@/lib/actions/create-action";
import { formatCount } from "@/lib/format";
import {
  deleteMockExamSchema,
  deleteMockResultSchema,
  mockExamSchema,
  saveMockResultSchema,
} from "../schemas";

const NOT_ALLOWED = "Bu işlem için yetkin yok.";

/** Sonuç kaydı / silme sonrası tazelenen yollar (10 §4). */
const RESULT_PATHS = [
  "/student/exams",
  "/student/today",
  "/coach/students",
  "/coach/exams",
  "/parent",
] as const;
const EXAM_PATHS = ["/coach/exams", "/student/exams"] as const;

/** Katalog denemesi ekle / düzenle (koç, owner). Kurum oturum sahibinin kurumu; RLS doğrular. */
export const upsertMockExam = createAction({
  name: "upsertMockExam",
  schema: mockExamSchema,
  roles: ["coach", "owner"],
  revalidate: EXAM_PATHS,
  handler: async (input, ctx) => {
    const values = {
      template_id: input.templateId,
      subject_id: input.subjectId,
      title: input.title,
      publisher: input.publisher,
      exam_date: input.examDate,
    };
    if (input.id) {
      const { data, error } = await ctx.supabase
        .from("mock_exams")
        .update(values)
        .eq("id", input.id)
        .select("id");
      if (error) throw error;
      if (data.length === 0) throw new ActionError("Deneme bulunamadı; sayfayı yenile.");
      return { id: input.id };
    }
    const { data, error } = await ctx.supabase
      .from("mock_exams")
      .insert({
        ...values,
        organization_id: ctx.profile.organization_id,
        created_by: ctx.userId,
      })
      .select("id")
      .single();
    if (error) {
      if (error.code === "42501") throw new ActionError(NOT_ALLOWED);
      throw error;
    }
    return { id: data.id };
  },
});

/**
 * Katalog denemesini sil (koç, owner). Sonucu olan deneme silinemez (`on delete restrict`, karar
 * C5): "Bu denemeyi 3 öğrenci girdi; önce sonuçları sil".
 */
export const deleteMockExam = createAction({
  name: "deleteMockExam",
  schema: deleteMockExamSchema,
  roles: ["coach", "owner"],
  revalidate: EXAM_PATHS,
  handler: async (input, ctx) => {
    const { data, error } = await ctx.supabase
      .from("mock_exams")
      .delete()
      .eq("id", input.id)
      .select("id");
    if (error) {
      if (error.code === "23503") {
        const { count } = await ctx.supabase
          .from("mock_exam_results")
          .select("id", { count: "exact", head: true })
          .eq("mock_exam_id", input.id);
        throw new ActionError(
          `Bu denemeyi ${formatCount(count ?? 0, "öğrenci")} girdi; önce sonuçları sil.`,
        );
      }
      if (error.code === "42501") throw new ActionError(NOT_ALLOWED);
      throw error;
    }
    if (data.length === 0) throw new ActionError("Deneme bulunamadı; sayfayı yenile.");
    return { id: input.id };
  },
});

const RPC_MESSAGES: Record<string, string> = {
  invalid_exam: "Seçilen deneme senin konu listende değil; sayfayı yenile.",
  invalid_subject: "Bir ders konu listende değil ya da tekrar ediyor; sayfayı yenile.",
  count_exceeded: "Bir derste doğru + yanlış + boş sınavdaki soru sayısını aşıyor.",
  invalid_topic: "Bir konu seçili derslerden birine ait değil; sayfayı yenile.",
  title_required: "Deneme adı gir.",
  not_found: "Deneme sonucu bulunamadı; sayfayı yenile.",
};

/**
 * Sonuç kaydı / düzenleme → `save_mock_exam_result` (tek transaction; RLS: öğrenci kendi, koç kendi
 * öğrencisi, owner kurum). Öğrenci yalnızca kendi kimliğiyle çağırabilir.
 */
export const saveMockResult = createAction({
  name: "saveMockResult",
  schema: saveMockResultSchema,
  roles: ["student", "coach", "owner"],
  revalidate: RESULT_PATHS,
  handler: async (input, ctx) => {
    if (ctx.profile.role === "student" && input.studentId !== ctx.userId) {
      throw new ActionError(NOT_ALLOWED);
    }
    const { data, error } = await ctx.supabase.rpc("save_mock_exam_result", {
      p_result: {
        id: input.id ?? null,
        student_id: input.studentId,
        mock_exam_id: input.mockExamId,
        custom_title: input.customTitle,
        subject_id: input.subjectId,
        taken_on: input.takenOn,
        duration_minutes: input.durationMinutes,
        score: input.score,
        percentile: input.percentile,
        note: input.note,
      },
      p_subjects: input.subjects.map((s) => ({
        subject_id: s.subjectId,
        correct: s.correct,
        wrong: s.wrong,
        blank: s.blank,
      })),
      p_topic_ids: input.topicIds,
    });
    if (error) {
      if (error.code === "42501") throw new ActionError(NOT_ALLOWED);
      if (error.code === "23505") {
        throw new ActionError("Bu denemeyi zaten girdin; listeden açıp düzenleyebilirsin.");
      }
      const known = Object.keys(RPC_MESSAGES).find((k) => error.message.includes(k));
      if (known) throw new ActionError(RPC_MESSAGES[known]!);
      throw error;
    }
    return { id: data };
  },
});

/** Sonucu sil (RLS; alt satırlar cascade). */
export const deleteMockResult = createAction({
  name: "deleteMockResult",
  schema: deleteMockResultSchema,
  roles: ["student", "coach", "owner"],
  revalidate: RESULT_PATHS,
  handler: async (input, ctx) => {
    if (ctx.profile.role === "student" && input.studentId !== ctx.userId) {
      throw new ActionError(NOT_ALLOWED);
    }
    const { data, error } = await ctx.supabase
      .from("mock_exam_results")
      .delete()
      .eq("id", input.id)
      .eq("student_id", input.studentId)
      .select("id");
    if (error) {
      if (error.code === "42501") throw new ActionError(NOT_ALLOWED);
      throw error;
    }
    if (data.length === 0) throw new ActionError("Deneme sonucu bulunamadı; sayfayı yenile.");
    return { id: input.id };
  },
});
