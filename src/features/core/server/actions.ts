"use server";

import { redirect } from "next/navigation";
import { pathForMissingProfile } from "@/lib/auth/require-role";
import { homeFor } from "@/lib/auth/routes";
import { identifierToEmail } from "@/lib/auth/username";
import { serverEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { loginSchema } from "../schemas";

export type LoginState = { error?: string };

/** Her başarısız girişte aynı mesaj: hesap var mı, e-posta doğrulanmış mı sızdırılmaz. */
const LOGIN_ERROR = "Kullanıcı adı veya şifre hatalı.";

/**
 * Giriş: tek alan kullanıcı adı (öğrenci) ya da e-posta (koç, veli, owner) kabul eder.
 * Oturum gerektirmediği için createAction sarmalayıcısı kullanılmaz.
 */
export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = loginSchema.safeParse({
    identifier: formData.get("identifier"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { error: LOGIN_ERROR };

  const email = identifierToEmail(parsed.data.identifier, serverEnv.studentEmailDomain);
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password: parsed.data.password,
  });
  if (error || !data.user) return { error: LOGIN_ERROR };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", data.user.id)
    .maybeSingle();

  if (!profile) {
    redirect(
      pathForMissingProfile({
        userId: data.user.id,
        email: data.user.email ?? null,
        userMetadata: data.user.user_metadata ?? {},
        profile: null,
      }),
    );
  }
  redirect(homeFor(profile.role));
}

export async function logout(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
