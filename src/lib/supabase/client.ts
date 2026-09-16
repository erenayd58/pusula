"use client";

import { createBrowserClient } from "@supabase/ssr";
import { publicEnv } from "@/lib/env";
import type { Database } from "@/types/database.types";

/** Tarayıcı istemcisi (çerez tabanlı oturum). Sunucu bileşenlerinde `server.ts` kullanılır. */
export function createClient() {
  return createBrowserClient<Database>(publicEnv.supabaseUrl, publicEnv.supabasePublishableKey);
}
