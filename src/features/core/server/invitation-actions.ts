"use server";

import { redirect } from "next/navigation";
import { ActionError, createAction } from "@/lib/actions/create-action";
import { getSessionUser } from "@/lib/auth/get-session-user";
import { homeFor } from "@/lib/auth/routes";
import { publicEnv } from "@/lib/env";
import { INVITATION_TTL_DAYS, generateInvitationCode } from "@/lib/invitations/code";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { fail, ok, type Result } from "@/lib/result";
import {
  INVITATION_INVALID,
  acceptInvitationSchema,
  registerParentSchema,
  studentIdSchema,
} from "../schemas";

/**
 * Koç/owner, öğrencisi için veli davet kodu üretir. Kullanıcı istemcisiyle insert:
 * `invitations_insert` politikası koçun sadece kendi öğrencisi için üretmesini zorlar.
 * Benzersiz kod çakışmasında (23505) yeniden üretilir.
 */
export const createParentInvitation = createAction({
  name: "createParentInvitation",
  schema: studentIdSchema,
  roles: ["coach", "owner"],
  handler: async (input, ctx) => {
    const expiresAt = new Date(Date.now() + INVITATION_TTL_DAYS * 24 * 60 * 60 * 1000);
    for (let attempt = 0; attempt < 3; attempt++) {
      const code = generateInvitationCode();
      const { error } = await ctx.supabase.from("invitations").insert({
        organization_id: ctx.profile.organization_id,
        code,
        role: "parent",
        student_id: input.studentId,
        created_by: ctx.userId,
        expires_at: expiresAt.toISOString(),
      });
      if (!error) return { code, expiresAt: expiresAt.toISOString() };
      if (error.code === "23505") continue;
      if (error.code === "42501") throw new ActionError("Bu öğrenci için davet üretme yetkin yok.");
      throw error;
    }
    throw new ActionError("Davet kodu üretilemedi. Tekrar dene.");
  },
});

export type RegisterParentState = { error?: string; fieldErrors?: Record<string, string[]> };

/**
 * Veli kaydı (02 karar #20: açık kayıt + davete bağlı profil). Oturum yok; createAction
 * kullanılmaz. Kod önce sunucuda (admin istemcisi, salt okuma) doğrulanır, sonra signUp:
 * GoTrue doğrulama e-postası gönderir. Profil e-posta doğrulanıp accept_invitation çağrılınca
 * oluşur. Var olan e-postada da aynı ekran gösterilir (hesap varlığı sızdırılmaz).
 */
export async function registerParent(
  _prev: RegisterParentState,
  formData: FormData,
): Promise<RegisterParentState> {
  const parsed = registerParentSchema.safeParse({
    code: formData.get("code"),
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    password: formData.get("password"),
    relation: formData.get("relation"),
  });
  if (!parsed.success) {
    const fieldErrors: Record<string, string[]> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path.map(String).join(".") || "_form";
      (fieldErrors[key] ??= []).push(issue.message);
    }
    return { error: "Formda hatalı alanlar var. Kontrol edip tekrar deneyin.", fieldErrors };
  }
  const input = parsed.data;

  const admin = createAdminClient();
  const { data: invitation } = await admin
    .from("invitations")
    .select("id")
    .eq("code", input.code)
    .eq("role", "parent")
    .is("used_at", null)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();
  if (!invitation) return { error: INVITATION_INVALID };

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email: input.email,
    password: input.password,
    options: {
      emailRedirectTo: `${publicEnv.siteUrl}/auth/confirm`,
      data: {
        full_name: input.fullName,
        invitation_code: input.code,
        relation: input.relation,
      },
    },
  });
  if (error) {
    console.error("[registerParent] signUp başarısız", { code: error.code });
    return { error: "Kayıt başlatılamadı. Biraz sonra tekrar deneyin." };
  }
  redirect("/invite/check-email");
}

/**
 * Daveti kabul: oturum var (e-posta doğrulandı), profil olmayabilir. RPC profili ve bağlantıyı
 * kurar; sonra token yenilenir (rol claim'i) ve /consent'e gidilir.
 */
export async function acceptInvitation(raw: unknown): Promise<Result<{ studentId: string }>> {
  const session = await getSessionUser();
  if (!session) redirect("/login");
  if (session.profile && session.profile.role !== "parent") redirect(homeFor(session.profile.role));

  const parsed = acceptInvitationSchema.safeParse(raw);
  if (!parsed.success) return fail(INVITATION_INVALID);

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("accept_invitation", {
    p_code: parsed.data.code,
    p_full_name: parsed.data.fullName ?? "",
    p_relation: parsed.data.relation,
  });
  if (error || !data) return fail(INVITATION_INVALID);

  await supabase.auth.refreshSession();
  return ok({ studentId: data });
}
