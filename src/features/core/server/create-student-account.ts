import "server-only";

import { ActionError } from "@/lib/actions/create-action";
import type { AdminSupabaseClient } from "@/lib/supabase/admin";
import type { CreateStudentInput } from "../schemas";

export const CREATE_STUDENT_ERRORS = {
  usernameTaken: "Bu kullanıcı adı kullanılıyor. Başka bir ad dene.",
  authFailed: "Öğrenci hesabı oluşturulamadı. Tekrar dene.",
  notAllowed: "Bu koça öğrenci ekleme yetkin yok.",
} as const;

/**
 * Auth kullanıcısı + profil + öğrenci satırı. RPC başarısız olursa oluşturulan Auth kullanıcısı
 * silinir (telafi adımı); silme de başarısız olursa loglanır (kimlik değil, yalnızca id).
 */
export async function createStudentAccount(opts: {
  admin: AdminSupabaseClient;
  actorId: string;
  coachId: string;
  email: string;
  input: CreateStudentInput;
}): Promise<{ studentId: string }> {
  const { admin, actorId, coachId, email, input } = opts;

  const { data: existing } = await admin
    .from("profiles")
    .select("id")
    .eq("username", input.username)
    .maybeSingle();
  if (existing) {
    throw new ActionError(CREATE_STUDENT_ERRORS.usernameTaken, {
      username: [CREATE_STUDENT_ERRORS.usernameTaken],
    });
  }

  const { data: created, error: authError } = await admin.auth.admin.createUser({
    email,
    password: input.temporaryPassword,
    email_confirm: true,
    user_metadata: { username: input.username },
  });
  if (authError || !created.user) {
    throw new ActionError(CREATE_STUDENT_ERRORS.authFailed);
  }
  const authUserId = created.user.id;

  const { error: rpcError } = await admin.rpc("create_student_account", {
    p_actor_id: actorId,
    p_auth_user_id: authUserId,
    p_coach_id: coachId,
    p_full_name: input.fullName,
    p_username: input.username,
    p_season: input.season,
    p_exam_date: input.examDate,
  });

  if (rpcError) {
    const { error: deleteError } = await admin.auth.admin.deleteUser(authUserId);
    if (deleteError) {
      console.error("[createStudentAccount] telafi başarısız: Auth kullanıcısı silinemedi", {
        authUserId,
      });
    }
    if (rpcError.code === "42501") throw new ActionError(CREATE_STUDENT_ERRORS.notAllowed);
    if (rpcError.code === "23505") {
      throw new ActionError(CREATE_STUDENT_ERRORS.usernameTaken, {
        username: [CREATE_STUDENT_ERRORS.usernameTaken],
      });
    }
    throw rpcError;
  }

  return { studentId: authUserId };
}
