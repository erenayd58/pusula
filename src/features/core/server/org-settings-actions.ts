"use server";

import { ActionError, createAction } from "@/lib/actions/create-action";
import { orgSettingsFormSchema } from "../schemas";

/**
 * Kurum ayarları (08 §1.2, karar A5): yalnızca owner; `organizations` UPDATE politikası zaten
 * owner'da (RLS son savunma). Eşikler koda gömülü değildir, bu JSON'dan okunur. Ayar değişince
 * uyarı/plan ekranları yeniden hesaplanır (08 §4 revalidate listesi).
 */
export const updateOrgSettings = createAction({
  name: "updateOrgSettings",
  schema: orgSettingsFormSchema,
  roles: ["owner"],
  revalidate: ["/coach", "/coach/students", "/coach/settings", "/student/today"],
  handler: async (input, ctx) => {
    const { data, error } = await ctx.supabase
      .from("organizations")
      .update({ settings: input })
      .eq("id", ctx.profile.organization_id)
      .select("id");
    if (error) {
      if (error.code === "42501") throw new ActionError("Bu işlem için yetkin yok.");
      throw error;
    }
    if (data.length === 0) throw new ActionError("Kurum bulunamadı.");
    return { updated: true };
  },
});
