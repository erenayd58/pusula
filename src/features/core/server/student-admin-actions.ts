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

/**
 * Öğrenci silme: sadece owner (`can_delete_student`). Auth kullanıcısı silinir; profiles →
 * students → bağlı tablolar cascade ile gider (pgTAP 110). Depo temizliği Faz 6 (fotoğraflar).
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
