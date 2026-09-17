import "server-only";

import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/types";

export type SessionUser = {
  userId: string;
  email: string | null;
  /** auth.users.raw_user_meta_data (kayıtta verilen davet kodu vb.). Güvenlik kararı için kullanılmaz. */
  userMetadata: Record<string, unknown>;
  /** Profil yoksa null: oturum var ama `profiles` satırı yok (davet henüz kabul edilmemiş vb.). */
  profile: Profile | null;
};

/**
 * Oturum + profil + rol. `getClaims()` token'ı doğrular (asimetrik anahtarda yerel, simetrikte
 * Auth sunucusu); profil ve rol her istekte veritabanından okunur (RLS: kendi satırı).
 * React `cache()` ile istek başına bir kez çalışır.
 */
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims) return null;

  const { claims } = data;
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", claims.sub)
    .maybeSingle();

  return {
    userId: claims.sub,
    email: claims.email ?? null,
    userMetadata: claims.user_metadata ?? {},
    profile: profile ?? null,
  };
});
