import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { publicEnv } from "@/lib/env";
import type { Database } from "@/types/database.types";

/**
 * Sunucu istemcisi: Sunucu Bileşeni, Server Action ve Route Handler'da kullanılır; kullanıcının
 * oturumuyla çalıştığı için RLS uygulanır. Her istekte yeniden oluşturulur (istek başına çerez).
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(publicEnv.supabaseUrl, publicEnv.supabasePublishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Sunucu Bileşeni içinden çerez yazılamaz; oturum yenileme proxy.ts'de yapıldığı
          // için burada yutulur.
        }
      },
    },
  });
}

export type ServerSupabaseClient = Awaited<ReturnType<typeof createClient>>;
