"use server";

import { z } from "zod";
import { ActionError, createAction } from "@/lib/actions/create-action";
import { getEnabledModules } from "@/modules/get-enabled-modules";
import { getModule, resolveToggle } from "@/modules/registry";

export const setStudentModuleSchema = z.object({
  studentId: z.uuid("Öğrenci kimliği geçersiz."),
  moduleId: z.string().min(1),
  enabled: z.boolean(),
});

export type AppliedModuleChange = { moduleId: string; name: string; enabled: boolean };

/**
 * Koç bir modülü açar/kapatır (02-mimari Bölüm 3.3). Bağımlılıklar sunucuda çözülür: açarken
 * kapalı `dependsOn` modülleri de açılır, kapatırken bağımlı modüller de kapanır. Uygulanan
 * değişiklikler (adlarıyla) döner; arayüz bunları bildirir ve `router.refresh()` ile sayfayı yeniler.
 * RLS: yalnızca öğrencinin koçu/owner yazabilir.
 */
export const setStudentModule = createAction({
  name: "setStudentModule",
  schema: setStudentModuleSchema,
  roles: ["coach", "owner"],
  handler: async (input, ctx): Promise<{ changes: AppliedModuleChange[] }> => {
    const target = getModule(input.moduleId);
    if (!target) throw new ActionError("Böyle bir modül yok.");
    if (target.core) throw new ActionError("Çekirdek modül kapatılamaz.");

    const current = await getEnabledModules(input.studentId);
    const changes = resolveToggle(current, input.moduleId, input.enabled);
    if (changes.length === 0) return { changes: [] };

    const { error } = await ctx.supabase.from("student_modules").upsert(
      changes.map((c) => ({
        student_id: input.studentId,
        module_id: c.moduleId,
        enabled: c.enabled,
      })),
      { onConflict: "student_id,module_id" },
    );
    if (error) {
      if (error.code === "42501") {
        throw new ActionError("Bu öğrencinin modüllerini değiştirme yetkin yok.");
      }
      throw error;
    }
    return {
      changes: changes.map((c) => ({ ...c, name: getModule(c.moduleId)?.name ?? c.moduleId })),
    };
  },
});
