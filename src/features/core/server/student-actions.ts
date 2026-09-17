"use server";

import { ActionError, createAction } from "@/lib/actions/create-action";
import { usernameToEmail } from "@/lib/auth/username";
import { serverEnv } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { createStudentSchema } from "../schemas";
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
