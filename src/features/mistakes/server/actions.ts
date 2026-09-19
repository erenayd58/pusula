"use server";

import { ActionError, createAction } from "@/lib/actions/create-action";
import {
  createMistakeSchema,
  deleteMistakeSchema,
  setMistakeStatusSchema,
  updateMistakeSchema,
} from "../schemas";
import { BUCKET } from "../lib/storage";

/** Kayıt sonrası tazelenen yollar (10 §4). */
const PATHS = ["/student/mistakes", "/student/topics", "/coach/students"] as const;

const NOT_ALLOWED = "Bu işlem için yetkin yok.";
const NOT_FOUND = "Kayıt bulunamadı; sayfayı yenile.";

/**
 * Yeni kayıt (yalnızca öğrenci, kendi adına; RLS `student_id = auth.uid()`). Fotoğraf istemciden
 * doğrudan bucket'a yüklendi; yolun `{org}/{öğrenci}/` ile başladığı burada doğrulanır (depo
 * politikası yüklemede zaten denetledi). Satır yazılamazsa istemci nesneyi siler.
 */
export const createMistake = createAction({
  name: "createMistake",
  schema: createMistakeSchema,
  roles: ["student"],
  revalidate: PATHS,
  handler: async (input, ctx) => {
    const prefix = `${ctx.profile.organization_id}/${ctx.userId}/`;
    if (input.imagePath !== null && !input.imagePath.startsWith(prefix)) {
      throw new ActionError("Fotoğraf yolu geçersiz.");
    }
    const { data, error } = await ctx.supabase
      .from("mistakes")
      .insert({
        student_id: ctx.userId,
        subject_id: input.subjectId,
        topic_id: input.topicId,
        mock_result_id: input.mockResultId,
        image_path: input.imagePath,
        reason: input.reason,
        note: input.note,
        created_by: ctx.userId,
      })
      .select("id")
      .single();
    if (error) {
      if (error.code === "42501") throw new ActionError(NOT_ALLOWED);
      if (error.code === "23503") throw new ActionError("Ders ya da konu bulunamadı.");
      throw error;
    }
    return { id: data.id };
  },
});

/** Neden / konu / not düzenleme (öğrenci kendi, koç öğrencisi; RLS). */
export const updateMistake = createAction({
  name: "updateMistake",
  schema: updateMistakeSchema,
  roles: ["student", "coach", "owner"],
  revalidate: PATHS,
  handler: async (input, ctx) => {
    const { data, error } = await ctx.supabase
      .from("mistakes")
      .update({
        subject_id: input.subjectId,
        topic_id: input.topicId,
        reason: input.reason,
        note: input.note,
      })
      .eq("id", input.id)
      .eq("student_id", input.studentId)
      .select("id");
    if (error) {
      if (error.code === "23503") throw new ActionError("Ders ya da konu bulunamadı.");
      throw error;
    }
    if (data.length === 0) throw new ActionError(NOT_FOUND);
    return { id: input.id };
  },
});

/** "Çözdüm" / geri al: durum ve `solved_at` birlikte (check kısıtı). */
export const setMistakeStatus = createAction({
  name: "setMistakeStatus",
  schema: setMistakeStatusSchema,
  roles: ["student", "coach", "owner"],
  revalidate: PATHS,
  handler: async (input, ctx) => {
    const { data, error } = await ctx.supabase
      .from("mistakes")
      .update(
        input.solved
          ? { status: "solved", solved_at: new Date().toISOString() }
          : { status: "open", solved_at: null },
      )
      .eq("id", input.id)
      .eq("student_id", input.studentId)
      .select("id");
    if (error) throw error;
    if (data.length === 0) throw new ActionError(NOT_FOUND);
    return { id: input.id, solved: input.solved };
  },
});

/** Kayıt silme: önce satır (RLS), sonra depo nesnesi (yol satırdan okunur; politika kapıyı uygular). */
export const deleteMistake = createAction({
  name: "deleteMistake",
  schema: deleteMistakeSchema,
  roles: ["student", "coach", "owner"],
  revalidate: PATHS,
  handler: async (input, ctx) => {
    const { data, error } = await ctx.supabase
      .from("mistakes")
      .delete()
      .eq("id", input.id)
      .eq("student_id", input.studentId)
      .select("image_path");
    if (error) throw error;
    const row = data[0];
    if (!row) throw new ActionError(NOT_FOUND);
    if (row.image_path) {
      const { error: storageError } = await ctx.supabase.storage
        .from(BUCKET)
        .remove([row.image_path]);
      // Satır gitti; nesne kalırsa öğrenci silinirken klasör temizliğiyle gider (loglanmaz: yol öğrenci verisi).
      if (storageError) console.error("[action:deleteMistake] depo nesnesi silinemedi");
    }
    return { id: input.id };
  },
});
