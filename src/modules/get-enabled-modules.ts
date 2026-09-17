import "server-only";

import { notFound } from "next/navigation";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { mergeEnabled } from "@/modules/lib/registry-helpers";
import { modules } from "@/modules/registry";

/**
 * Öğrenci için açık modül kimlikleri (02-mimari Bölüm 3.3). `student_modules` satırı yoksa
 * manifestteki `defaultEnabled`; `core` modüller her zaman açık. Kullanıcının oturumuyla okunur
 * (RLS: öğrenci kendini, veli çocuğunu, koç öğrencisini görür). React `cache()` ile istek
 * başına bir kez çalışır.
 */
export const getEnabledModules = cache(async (studentId: string): Promise<Set<string>> => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("student_modules")
    .select("module_id, enabled")
    .eq("student_id", studentId);
  if (error) throw error;
  return mergeEnabled(modules, data);
});

/** Modül sayfalarının ilk satırı: modül bu öğrenci için kapalıysa 404. */
export async function requireModule(studentId: string, moduleId: string): Promise<void> {
  const enabled = await getEnabledModules(studentId);
  if (!enabled.has(moduleId)) notFound();
}
