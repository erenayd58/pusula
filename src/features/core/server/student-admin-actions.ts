"use server";

import { ActionError, createAction } from "@/lib/actions/create-action";
import { createAdminClient } from "@/lib/supabase/admin";
import { assignCoachSchema, resetStudentPasswordSchema, studentIdSchema } from "../schemas";

const STUDENTS_PATH = "/coach/students";

const NOT_ALLOWED = "Bu öğrenci için yetkin yok.";

/**
 * Öğrenci şifresi sıfırlama: koç (kendi öğrencisi) veya owner. Yetki veritabanında
 * (`can_manage_student`, kullanıcının oturumuyla) doğrulanır, sonra admin API.
 * Şifre loglanmaz, yanıtta döndürülmez (koç zaten yazdı).
 */
export const resetStudentPassword = createAction({
  name: "resetStudentPassword",
  schema: resetStudentPasswordSchema,
  roles: ["coach", "owner"],
  handler: async (input, ctx) => {
    const { data: allowed } = await ctx.supabase.rpc("can_manage_student", {
      p_student_id: input.studentId,
    });
    if (!allowed) throw new ActionError(NOT_ALLOWED);

    const admin = createAdminClient();
    const { error } = await admin.auth.admin.updateUserById(input.studentId, {
      password: input.newPassword,
    });
    if (error) throw new ActionError("Şifre sıfırlanamadı. Tekrar dene.");
    return { studentId: input.studentId };
  },
});

/** Yanlış defteri fotoğrafları (03 §8); bucket adı `features/mistakes` ile aynı, modül importu yok. */
const MISTAKE_IMAGES_BUCKET = "mistake-images";
const STORAGE_PAGE = 100;

/**
 * Öğrencinin depo klasörünü temizler (KVKK): `mistake-images/{org}/{öğrenci}/` altındaki nesneler
 * sayfa sayfa listelenir ve silinir; klasör boşsa hiçbir şey yapmaz. Admin istemcisi (RLS yok),
 * öncesinde yetki veritabanında doğrulandı.
 */
async function removeStudentImages(
  admin: ReturnType<typeof createAdminClient>,
  organizationId: string,
  studentId: string,
): Promise<void> {
  const prefix = `${organizationId}/${studentId}`;
  for (;;) {
    const { data, error } = await admin.storage
      .from(MISTAKE_IMAGES_BUCKET)
      .list(prefix, { limit: STORAGE_PAGE });
    if (error) throw new ActionError("Fotoğraflar silinemedi. Tekrar dene.");
    const names = data.filter((o) => o.id !== null).map((o) => `${prefix}/${o.name}`);
    if (names.length === 0) return;
    const { error: removeError } = await admin.storage.from(MISTAKE_IMAGES_BUCKET).remove(names);
    if (removeError) throw new ActionError("Fotoğraflar silinemedi. Tekrar dene.");
    if (data.length < STORAGE_PAGE) return;
  }
}

/**
 * Öğrenci silme: sadece owner (`can_delete_student`). Önce depo klasörü (Faz 6b fotoğraflar), sonra
 * Auth kullanıcısı silinir; profiles → students → bağlı tablolar cascade ile gider (pgTAP 110).
 */
export const deleteStudent = createAction({
  name: "deleteStudent",
  schema: studentIdSchema,
  roles: ["owner"],
  revalidate: [STUDENTS_PATH],
  handler: async (input, ctx) => {
    const { data: allowed } = await ctx.supabase.rpc("can_delete_student", {
      p_student_id: input.studentId,
    });
    if (!allowed) throw new ActionError(NOT_ALLOWED);

    const admin = createAdminClient();
    await removeStudentImages(admin, ctx.profile.organization_id, input.studentId);
    const { error } = await admin.auth.admin.deleteUser(input.studentId);
    if (error) throw new ActionError("Öğrenci silinemedi. Tekrar dene.");
    return { studentId: input.studentId };
  },
});

/** Koç ataması: RPC owner, kurum ve rol kontrolünü kendisi yapar. */
export const assignCoach = createAction({
  name: "assignCoach",
  schema: assignCoachSchema,
  roles: ["owner"],
  revalidate: [STUDENTS_PATH],
  handler: async (input, ctx) => {
    const { error } = await ctx.supabase.rpc("assign_coach", {
      p_student_id: input.studentId,
      p_coach_id: input.coachId,
    });
    if (error) {
      if (error.code === "42501") throw new ActionError("Bu atama için yetkin yok.");
      throw error;
    }
    return { studentId: input.studentId, coachId: input.coachId };
  },
});
