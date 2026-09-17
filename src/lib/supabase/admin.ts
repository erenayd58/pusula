import "server-only";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { publicEnv, serverEnv } from "@/lib/env";
import type { Database } from "@/types/database.types";

/**
 * Secret key'li istemci: RLS'yi atlar. Sadece öğrenci hesabı oluşturma, şifre sıfırlama ve
 * silme ile davet ön kontrolü için; her kullanımdan önce çağıranın yetkisi veritabanında
 * doğrulanır (02-mimari Bölüm 4.4). İstemci bileşeninden import edilemez ("server-only").
 */
export function createAdminClient() {
  return createSupabaseClient<Database>(publicEnv.supabaseUrl, serverEnv.supabaseSecretKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export type AdminSupabaseClient = ReturnType<typeof createAdminClient>;
