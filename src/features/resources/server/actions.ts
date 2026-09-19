"use server";

import { ActionError, createAction } from "@/lib/actions/create-action";
import { formatCount } from "@/lib/format";
import { generateSections, type SectionDraft } from "@/lib/resources/sections";
import type { ServerSupabaseClient } from "@/lib/supabase/server";
import {
  addSectionsSchema,
  assignResourceSchema,
  createResourceSchema,
  MAX_SECTIONS_PER_RESOURCE,
  moveSectionSchema,
  resourceIdSchema,
  sectionIdSchema,
  setSectionTopicsSchema,
  unassignResourceSchema,
  updateResourceSchema,
  updateSectionSchema,
  type SectionBatchInput,
} from "../schemas";

const NOT_ALLOWED = "Bu işlem için yetkin yok.";
const NOT_FOUND = "Kaynak bulunamadı; sayfayı yenile.";

/** Kaynak değişikliği sonrası tazelenen yollar (11 §5). */
const PATHS = [
  "/student/resources",
  "/coach/resources",
  "/coach/students",
  "/coach/plans",
] as const;

/** RPC 22023 mesajlarını Türkçe'ye çevirir. */
function rpcMessage(message: string): string {
  if (message.includes("invalid_template"))
    return "Kaynak yalnızca kendi konu listene (şablon) eklenebilir.";
  if (message.includes("invalid_subject")) return "Ders bu şablonda yok.";
  if (message.includes("invalid_topic")) return "Konu seçilen derse ait değil.";
  if (message.includes("too_many_sections"))
    return `Bir kitapta en fazla ${MAX_SECTIONS_PER_RESOURCE} test.`;
  return "Kaynak kaydedilemedi. Tekrar dene.";
}

/** Test partisini satırlara açar (saf `generateSections`). */
function batchToDrafts(batch: SectionBatchInput, startSortOrder: number): SectionDraft[] {
  return generateSections({
    prefix: batch.prefix ?? "Test",
    from: batch.from,
    to: batch.to,
    questionCount: batch.questionCount ?? null,
    pageStart: batch.pageStart ?? null,
    pagesPerSection: batch.pagesPerSection ?? null,
    startSortOrder,
    subjectId: batch.subjectId ?? null,
  });
}

/** Konu, eşlenecek dersin (testin dersi, yoksa kitabın dersi) ünite konusu olmalı. */
async function assertTopicInSubject(
  supabase: ServerSupabaseClient,
  topicId: string | null,
  subjectId: string | null,
) {
  if (!topicId) return;
  const { data, error } = await supabase
    .from("topics")
    .select("subject_id")
    .eq("id", topicId)
    .maybeSingle();
  if (error) throw error;
  if (!data || (subjectId && data.subject_id !== subjectId)) {
    throw new ActionError("Konu seçilen derse ait değil.");
  }
}

/** Kitabın dersi (çok dersli → null). */
async function resourceSubject(supabase: ServerSupabaseClient, resourceId: string) {
  const { data, error } = await supabase
    .from("resources")
    .select("subject_id")
    .eq("id", resourceId)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new ActionError(NOT_FOUND);
  return data.subject_id;
}

/**
 * Yeni kitap + test partileri (tek RPC, tek transaction). Koç/owner kataloğa yazar; öğrenci
 * kendi özel kaynağını açar ve kaynak kendisine atanır (RPC `student_id` = çağıran).
 */
export const createResource = createAction({
  name: "createResource",
  schema: createResourceSchema,
  roles: ["student", "coach", "owner"],
  revalidate: PATHS,
  handler: async (input, ctx) => {
    let next = 0;
    const sections = input.batches.flatMap((b) => {
      const rows = batchToDrafts(b, next);
      next += rows.length;
      return rows;
    });
    const { data, error } = await ctx.supabase.rpc("create_resource", {
      p_resource: {
        template_id: input.templateId,
        subject_id: input.subjectId,
        type: input.type,
        title: input.title,
        publisher: input.publisher,
        publish_year: input.publishYear,
      },
      p_sections: sections.map((s) => ({
        title: s.title,
        subject_id: s.subjectId,
        topic_id: null,
        question_count: s.questionCount,
        page_start: s.pageStart,
        page_end: s.pageEnd,
        sort_order: s.sortOrder,
      })),
      p_assign_self: ctx.profile.role === "student",
    });
    if (error) {
      if (error.code === "42501") throw new ActionError(NOT_ALLOWED);
      if (error.code === "22023") throw new ActionError(rpcMessage(error.message));
      throw error;
    }
    return { id: data, sectionCount: sections.length };
  },
});

/** Kitap alanları (RLS: koç/owner katalog ve öğrencisinin özeli; öğrenci kendi özeli). */
export const updateResource = createAction({
  name: "updateResource",
  schema: updateResourceSchema,
  roles: ["student", "coach", "owner"],
  revalidate: PATHS,
  handler: async (input, ctx) => {
    const { data, error } = await ctx.supabase
      .from("resources")
      .update({
        title: input.title,
        publisher: input.publisher,
        publish_year: input.publishYear,
        type: input.type,
        subject_id: input.subjectId,
      })
      .eq("id", input.id)
      .select("id");
    if (error) {
      if (error.code === "42501") throw new ActionError(NOT_ALLOWED);
      throw error;
    }
    if (data.length === 0) throw new ActionError(NOT_FOUND);
    return { id: input.id };
  },
});

/** Kaynağı sil ("Kaldır"): testler cascade; soru kayıtları ve plan görevleri kalır, bağ kopar. */
export const deleteResource = createAction({
  name: "deleteResource",
  schema: resourceIdSchema,
  roles: ["student", "coach", "owner"],
  revalidate: PATHS,
  handler: async (input, ctx) => {
    const { data, error } = await ctx.supabase
      .from("resources")
      .delete()
      .eq("id", input.id)
      .select("id");
    if (error) {
      if (error.code === "42501") throw new ActionError(NOT_ALLOWED);
      throw error;
    }
    if (data.length === 0) throw new ActionError(NOT_FOUND);
    return { id: input.id };
  },
});

/** "Katalogda tut": öğrencinin özel kaynağı kurum kataloğuna geçer (atama kalır). Koç/owner. */
export const keepInCatalog = createAction({
  name: "keepInCatalog",
  schema: resourceIdSchema,
  roles: ["coach", "owner"],
  revalidate: PATHS,
  handler: async (input, ctx) => {
    const { data, error } = await ctx.supabase
      .from("resources")
      .update({ student_id: null })
      .eq("id", input.id)
      .select("id");
    if (error) {
      if (error.code === "42501") throw new ActionError(NOT_ALLOWED);
      throw error;
    }
    if (data.length === 0) throw new ActionError(NOT_FOUND);
    return { id: input.id };
  },
});

/** Mevcut kitaba parti ekle (tek insert, çok satır). */
export const addSections = createAction({
  name: "addSections",
  schema: addSectionsSchema,
  roles: ["student", "coach", "owner"],
  revalidate: PATHS,
  handler: async (input, ctx) => {
    const [{ data: existing, error: countError }, subjectId] = await Promise.all([
      ctx.supabase
        .from("resource_sections")
        .select("sort_order")
        .eq("resource_id", input.resourceId)
        .order("sort_order", { ascending: false })
        .limit(1),
      resourceSubject(ctx.supabase, input.resourceId),
    ]);
    if (countError) throw countError;
    if (subjectId === null && !input.batch.subjectId) {
      throw new ActionError("Çok dersli kitapta parti için ders seç.");
    }
    const { count, error: totalError } = await ctx.supabase
      .from("resource_sections")
      .select("id", { count: "exact", head: true })
      .eq("resource_id", input.resourceId);
    if (totalError) throw totalError;
    const start = (existing[0]?.sort_order ?? -1) + 1;
    const rows = batchToDrafts(input.batch, start);
    if ((count ?? 0) + rows.length > MAX_SECTIONS_PER_RESOURCE) {
      throw new ActionError(`Bir kitapta en fazla ${MAX_SECTIONS_PER_RESOURCE} test.`);
    }
    if (rows.length === 0) throw new ActionError("Parti boş; aralığı kontrol et.");
    const { data, error } = await ctx.supabase
      .from("resource_sections")
      .insert(
        rows.map((r) => ({
          resource_id: input.resourceId,
          title: r.title,
          subject_id: subjectId === null ? r.subjectId : null,
          question_count: r.questionCount,
          page_start: r.pageStart,
          page_end: r.pageEnd,
          sort_order: r.sortOrder,
        })),
      )
      .select("id");
    if (error) {
      if (error.code === "42501") throw new ActionError(NOT_ALLOWED);
      throw error;
    }
    return { added: data.length };
  },
});

/** Tek test düzenleme. */
export const updateSection = createAction({
  name: "updateSection",
  schema: updateSectionSchema,
  roles: ["student", "coach", "owner"],
  revalidate: PATHS,
  handler: async (input, ctx) => {
    if (input.pageStart && input.pageEnd && input.pageEnd < input.pageStart) {
      throw new ActionError("Bitiş sayfası başlangıçtan küçük olamaz.");
    }
    const bookSubject = await resourceSubject(ctx.supabase, input.resourceId);
    const subjectId = bookSubject === null ? input.subjectId : null;
    await assertTopicInSubject(ctx.supabase, input.topicId, subjectId ?? bookSubject);
    const { data, error } = await ctx.supabase
      .from("resource_sections")
      .update({
        title: input.title,
        subject_id: subjectId,
        topic_id: input.topicId,
        question_count: input.questionCount,
        page_start: input.pageStart,
        page_end: input.pageEnd,
      })
      .eq("id", input.id)
      .eq("resource_id", input.resourceId)
      .select("id");
    if (error) {
      if (error.code === "42501") throw new ActionError(NOT_ALLOWED);
      throw error;
    }
    if (data.length === 0) throw new ActionError(NOT_FOUND);
    return { id: input.id };
  },
});

export const deleteSection = createAction({
  name: "deleteSection",
  schema: sectionIdSchema,
  roles: ["student", "coach", "owner"],
  revalidate: PATHS,
  handler: async (input, ctx) => {
    const { data, error } = await ctx.supabase
      .from("resource_sections")
      .delete()
      .eq("id", input.id)
      .eq("resource_id", input.resourceId)
      .select("id");
    if (error) throw error;
    if (data.length === 0) throw new ActionError(NOT_FOUND);
    return { id: input.id };
  },
});

/** ↑↓ (RPC `move_resource_section`, security invoker). */
export const moveSection = createAction({
  name: "moveSection",
  schema: moveSectionSchema,
  roles: ["student", "coach", "owner"],
  revalidate: PATHS,
  handler: async (input, ctx) => {
    const { error } = await ctx.supabase.rpc("move_resource_section", {
      p_section_id: input.id,
      p_direction: input.direction,
    });
    if (error) {
      if (error.code === "42501") throw new ActionError(NOT_ALLOWED);
      throw error;
    }
    return { id: input.id };
  },
});

/** Seçili testleri konuya eşle (tek UPDATE). Konu, testlerin dersine ait olmalı. */
export const setSectionTopics = createAction({
  name: "setSectionTopics",
  schema: setSectionTopicsSchema,
  roles: ["student", "coach", "owner"],
  revalidate: PATHS,
  handler: async (input, ctx) => {
    if (input.topicId) {
      const [
        { data: topic, error: topicError },
        { data: sections, error: sectionsError },
        bookSubject,
      ] = await Promise.all([
        ctx.supabase.from("topics").select("subject_id").eq("id", input.topicId).maybeSingle(),
        ctx.supabase
          .from("resource_sections")
          .select("id, subject_id")
          .eq("resource_id", input.resourceId)
          .in("id", input.sectionIds),
        resourceSubject(ctx.supabase, input.resourceId),
      ]);
      if (topicError) throw topicError;
      if (sectionsError) throw sectionsError;
      if (!topic) throw new ActionError("Konu bulunamadı.");
      const mismatch = sections.some((s) => (s.subject_id ?? bookSubject) !== topic.subject_id);
      if (mismatch)
        throw new ActionError("Seçili testlerin dersi bu konunun dersiyle aynı olmalı.");
    }
    const { data, error } = await ctx.supabase
      .from("resource_sections")
      .update({ topic_id: input.topicId })
      .eq("resource_id", input.resourceId)
      .in("id", input.sectionIds)
      .select("id");
    if (error) {
      if (error.code === "42501") throw new ActionError(NOT_ALLOWED);
      throw error;
    }
    return { updated: data.length };
  },
});

/** Koç: birden fazla öğrenciye tek insert (`on conflict do nothing` yerine mevcutları elemek). */
export const assignResource = createAction({
  name: "assignResource",
  schema: assignResourceSchema,
  roles: ["coach", "owner"],
  revalidate: PATHS,
  handler: async (input, ctx) => {
    const { data: existing, error: existingError } = await ctx.supabase
      .from("student_resources")
      .select("student_id")
      .eq("resource_id", input.resourceId)
      .in("student_id", input.studentIds);
    if (existingError) throw existingError;
    const done = new Set(existing.map((e) => e.student_id));
    const rows = input.studentIds
      .filter((id) => !done.has(id))
      .map((id) => ({ student_id: id, resource_id: input.resourceId, assigned_by: ctx.userId }));
    if (rows.length === 0) return { assigned: 0, message: "Seçilen öğrencilere zaten atanmış." };
    const { error } = await ctx.supabase.from("student_resources").insert(rows);
    if (error) {
      if (error.code === "42501") throw new ActionError(NOT_ALLOWED);
      throw error;
    }
    return { assigned: rows.length, message: `${formatCount(rows.length, "öğrenciye")} atandı.` };
  },
});

export const unassignResource = createAction({
  name: "unassignResource",
  schema: unassignResourceSchema,
  roles: ["coach", "owner"],
  revalidate: PATHS,
  handler: async (input, ctx) => {
    const { data, error } = await ctx.supabase
      .from("student_resources")
      .delete()
      .eq("resource_id", input.resourceId)
      .eq("student_id", input.studentId)
      .select("resource_id");
    if (error) throw error;
    if (data.length === 0) throw new ActionError("Atama bulunamadı; sayfayı yenile.");
    return { removed: 1 };
  },
});

/** Öğrenci: katalogdaki mevcut kitabı kendine alır (benzer ad önerisinden "Seç"). */
export const selfAssignResource = createAction({
  name: "selfAssignResource",
  schema: resourceIdSchema,
  roles: ["student"],
  revalidate: PATHS,
  handler: async (input, ctx) => {
    const { error } = await ctx.supabase
      .from("student_resources")
      .upsert(
        { student_id: ctx.userId, resource_id: input.id, assigned_by: ctx.userId },
        { onConflict: "student_id,resource_id", ignoreDuplicates: true },
      );
    if (error) {
      if (error.code === "42501") throw new ActionError(NOT_ALLOWED);
      throw error;
    }
    return { id: input.id };
  },
});
