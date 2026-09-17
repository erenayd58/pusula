import { execSync } from "node:child_process";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Test temizliği için yerel Supabase'e secret key ile doğrudan erişim (RLS'yi atlar).
 * Anahtar depoda ya da .env dosyasında değil, `supabase status` çıktısından okunur
 * (scripts/write-local-env.mjs ile aynı kaynak). Yalnızca yerel ve CI.
 */
let admin: SupabaseClient | undefined;

export function adminClient(): SupabaseClient {
  if (admin) return admin;
  const raw = execSync("pnpm exec supabase status -o json", { encoding: "utf8" });
  const status = JSON.parse(raw.slice(raw.indexOf("{"))) as { API_URL: string; SECRET_KEY: string };
  admin = createClient(status.API_URL, status.SECRET_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return admin;
}

/** Testlerin şablona eklediği konuları siler; `name` verilirse yalnızca onu, yoksa "E2E Konu" ile başlayanları. */
export async function deleteE2ETopics(name?: string): Promise<number> {
  const query = adminClient().from("topics").delete({ count: "exact" });
  const { count, error } = await (name ? query.eq("name", name) : query.like("name", "E2E Konu%"));
  if (error) throw error;
  return count ?? 0;
}
