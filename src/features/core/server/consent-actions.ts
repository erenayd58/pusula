"use server";

import { CONSENT_DOCUMENT_VERSION } from "@/config/constants";
import { ActionError, createAction } from "@/lib/actions/create-action";
import { giveConsentSchema } from "../schemas";

/**
 * Veli açık rızası: her çocuk için `privacy_notice` + `explicit_consent` satırı, given_by = veli,
 * recorded_by boş (RLS `consents_insert` veli koluyla). Sürüm sabiti tek yerde (config/constants).
 */
export const giveConsent = createAction({
  name: "giveConsent",
  schema: giveConsentSchema,
  roles: ["parent"],
  revalidate: ["/parent", "/consent"],
  handler: async (input, ctx) => {
    const rows = input.studentIds.flatMap((studentId) =>
      (["privacy_notice", "explicit_consent"] as const).map((type) => ({
        student_id: studentId,
        given_by: ctx.userId,
        type,
        document_version: CONSENT_DOCUMENT_VERSION,
      })),
    );
    const { error } = await ctx.supabase.from("consents").insert(rows);
    if (error) {
      if (error.code === "42501") throw new ActionError("Bu öğrenci için onay verme yetkiniz yok.");
      throw error;
    }
    return { count: input.studentIds.length, version: CONSENT_DOCUMENT_VERSION };
  },
});
