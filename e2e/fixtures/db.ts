import { execSync } from "node:child_process";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Test temizliği için yerel Supabase'e secret key ile doğrudan erişim (RLS'yi atlar).
 * Anahtar depoda ya da .env dosyasında değil, `supabase status` çıktısından okunur
 * (scripts/write-local-env.mjs ile aynı kaynak). Yalnızca yerel ve CI.
 */
let admin: SupabaseClient | undefined;

/** Güvenlik ağı: yalnızca yerel Supabase'de (127.0.0.1 / localhost) silme yapılır; aksi halde hata. */
export function assertLocal(url: string): void {
  const host = new URL(url).hostname;
  if (host !== "127.0.0.1" && host !== "localhost") {
    throw new Error(`e2e temizliği yalnızca yerel Supabase'de çalışır; bulunan: ${host}`);
  }
}

export function adminClient(): SupabaseClient {
  if (admin) return admin;
  const raw = execSync("pnpm exec supabase status -o json", { encoding: "utf8" });
  const status = JSON.parse(raw.slice(raw.indexOf("{"))) as { API_URL: string; SECRET_KEY: string };
  assertLocal(status.API_URL);
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

/** Testlerin kataloğa eklediği denemeleri siler ("E2E Deneme" ile başlayan; sonuçları öğrenciyle gitmiş olmalı). */
export async function deleteE2EMockExams(): Promise<number> {
  const { count, error } = await adminClient()
    .from("mock_exams")
    .delete({ count: "exact" })
    .like("title", "E2E Deneme%");
  if (error) throw error;
  return count ?? 0;
}

/** Testlerin bıraktığı "E2E Kaynak …" kitaplarını siler (testler cascade; kayıt bağı set null). */
export async function deleteE2EResources(): Promise<number> {
  const { count, error } = await adminClient()
    .from("resources")
    .delete({ count: "exact" })
    .like("title", "E2E Kaynak%");
  if (error) throw error;
  return count ?? 0;
}

/** Okul takvimini temizler (Faz 5a e2e): tüm konuların `school_finish_on` alanı boşaltılır. */
export async function clearSchoolDates(): Promise<number> {
  const { count, error } = await adminClient()
    .from("topics")
    .update({ school_finish_on: null }, { count: "exact" })
    .not("school_finish_on", "is", null);
  if (error) throw error;
  return count ?? 0;
}

/**
 * Testlerin bıraktığı öğrencileri (auth kullanıcısı → cascade ile profil, öğrenci ve verisi) siler.
 * Yalnızca e2e ön ekli sentetik e-postalar: `<prefix>.<zaman><rastgele>@…` (uniqueUsername).
 */
export async function deleteE2EStudents(): Promise<number> {
  const client = adminClient();
  const { data, error } = await client
    .from("profiles")
    .select("id, username")
    .eq("role", "student")
    .like("username", "%.%")
    .not("username", "in", "(ayse.k,mehmet.y,zeynep.a)");
  if (error) throw error;
  const targets = data.filter((p) => E2E_USERNAME.test(p.username ?? ""));
  for (const p of targets) {
    const { error: deleteError } = await client.auth.admin.deleteUser(p.id);
    if (deleteError) throw deleteError;
  }
  return targets.length;
}

/** uniqueUsername çıktısı: `<harf ön eki>.<base36 zaman damgası + rastgele>`; seed adları eşleşmez. */
const E2E_USERNAME = /^[a-z0-9]+\.[a-z0-9]{9,}$/;

/** Seed kurumu (Demo Dershane); yanlış defteri fotoğrafları `mistake-images/{org}/{öğrenci}/` altında. */
const SEED_ORG_ID = "a0000000-0000-4000-8000-000000000001";

/** Öğrencinin depo klasöründeki nesne adları (Storage API; RLS'siz). Klasör yoksa boş dizi. */
export async function listMistakeImages(studentId: string): Promise<string[]> {
  const { data, error } = await adminClient()
    .storage.from("mistake-images")
    .list(`${SEED_ORG_ID}/${studentId}`, { limit: 100 });
  if (error) throw error;
  return data.filter((o) => o.id !== null).map((o) => o.name);
}
