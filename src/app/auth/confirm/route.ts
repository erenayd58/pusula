import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

const OTP_TYPES: EmailOtpType[] = ["email", "signup", "recovery", "email_change", "magiclink"];

/**
 * E-posta doğrulama (Supabase SSR kalıbı): şablondaki bağlantı token_hash ile buraya gelir,
 * sunucu tarafında verifyOtp ile oturum açılır (token tarayıcıya sızmaz). `next` yalnızca
 * uygulama içi yol olabilir.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type");
  const nextParam = searchParams.get("next") ?? "/";
  const next = nextParam.startsWith("/") && !nextParam.startsWith("//") ? nextParam : "/";

  if (tokenHash && type && OTP_TYPES.some((t) => t === type)) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({
      type: type as EmailOtpType,
      token_hash: tokenHash,
    });
    if (!error) redirect(next);
  }
  redirect("/invite?error=link");
}
