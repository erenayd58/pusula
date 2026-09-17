"use server";

import { CONSENT_DOCUMENT_VERSION } from "@/config/constants";
import { ActionError, createAction } from "@/lib/actions/create-action";
import { giveConsentSchema, recordPaperConsentSchema } from "../schemas";
import { getConsentStatus } from "./queries";

const REQUIRED_TYPES = ["privacy_notice", "explicit_consent"] as const;

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
      REQUIRED_TYPES.map((type) => ({
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

/**
 * Kâğıt onayı (01 Bölüm 9): koç, veliden kâğıt üzerinde alınan onayı işler. İki satır,
 * given_by boş, recorded_by = koç (RLS `consents_insert` koç koluyla; owner da `is_coach_of`
 * kapsamında). Onay zaten tamsa ikinci kayıt açılmaz. Veli kapısını da geçirir (02 karar #23).
 */
export const recordPaperConsent = createAction({
  name: "recordPaperConsent",
  schema: recordPaperConsentSchema,
  roles: ["coach", "owner"],
  revalidate: ["/coach/students"],
  handler: async (input, ctx) => {
    const status = await getConsentStatus(input.studentId);
    if (status.complete) throw new ActionError("Bu öğrenci için onay zaten kayıtlı.");

    const rows = REQUIRED_TYPES.map((type) => ({
      student_id: input.studentId,
      given_by: null,
      recorded_by: ctx.userId,
      type,
      document_version: input.documentVersion,
      given_at: new Date(`${input.givenAt}T00:00:00+03:00`).toISOString(),
    }));
    const { error } = await ctx.supabase.from("consents").insert(rows);
    if (error) {
      if (error.code === "42501")
        throw new ActionError("Bu öğrenci için onay kaydetme yetkin yok.");
      throw error;
    }
    return { givenAt: input.givenAt, version: input.documentVersion };
  },
});
