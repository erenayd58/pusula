"use server";

import { ActionError, createAction } from "@/lib/actions/create-action";
import { usernameToEmail } from "@/lib/auth/username";
import { serverEnv } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { createStudentSchema, setParentDetailsSchema, updateExamDateSchema } from "../schemas";
import { createStudentAccount } from "./create-student-account";

const STUDENTS_PATH = "/coach/students";

/**
 * Koç → öğrenci oluşturma (01-proje-plani 6.3). Sıra: kullanıcı adı boş mu → Auth kullanıcısı
 * (admin API, e-posta doğrulanmış) → create_student_account RPC (yetki + profil + öğrenci tek
 * transaction) → RPC düşerse Auth kullanıcısı silinir (telafi). Mantık test edilebilir olsun
 * diye `createStudentAccount` içinde; burada sadece bağlam bağlanır.
 */
export const createStudent = createAction({
  name: "createStudent",
  schema: createStudentSchema,
  roles: ["coach", "owner"],
  revalidate: [STUDENTS_PATH],
  handler: async (input, ctx) => {
    const coachId = ctx.profile.role === "owner" ? (input.coachId ?? ctx.userId) : ctx.userId;
    if (ctx.profile.role === "coach" && input.coachId && input.coachId !== ctx.userId) {
      throw new ActionError("Koç yalnızca kendi öğrencisini oluşturabilir.");
    }
    return createStudentAccount({
      admin: createAdminClient(),
      actorId: ctx.userId,
      coachId,
      email: usernameToEmail(input.username, serverEnv.studentEmailDomain),
      input,
    });
  },
});

/** Sınav tarihi (geri sayım). `students.exam_date` kolon düzeyi UPDATE grant'ıyla; RLS koçu sınırlar. */
export const updateStudentExamDate = createAction({
  name: "updateStudentExamDate",
  schema: updateExamDateSchema,
  roles: ["coach", "owner"],
  revalidate: ["/coach/students", "/student/today"],
  handler: async (input, ctx) => {
    const { data, error } = await ctx.supabase
      .from("students")
      .update({ exam_date: input.examDate })
      .eq("profile_id", input.studentId)
      .select("profile_id");
    if (error) {
      if (error.code === "42501") throw new ActionError("Bu işlem için yetkin yok.");
      throw error;
    }
    if (data.length === 0) throw new ActionError("Öğrenci bulunamadı.");
    return { examDate: input.examDate };
  },
});

/**
 * Veli görünürlüğü (Faz 8, E8): `student_parents.can_view_details` — yanlış defteri sekmesi ve depo
 * kapısı (`can_read_mistakes`). RLS koçu kendi öğrencisiyle sınırlar.
 */
export const setParentDetails = createAction({
  name: "setParentDetails",
  schema: setParentDetailsSchema,
  roles: ["coach", "owner"],
  revalidate: ["/coach/students", "/parent"],
  handler: async (input, ctx) => {
    const { data, error } = await ctx.supabase
      .from("student_parents")
      .update({ can_view_details: input.canViewDetails })
      .eq("student_id", input.studentId)
      .eq("parent_id", input.parentId)
      .select("parent_id");
    if (error) {
      if (error.code === "42501") throw new ActionError("Bu işlem için yetkin yok.");
      throw error;
    }
    if (data.length === 0) throw new ActionError("Veli bağlantısı bulunamadı.");
    return { canViewDetails: input.canViewDetails };
  },
});
