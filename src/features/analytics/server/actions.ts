"use server";

import { addDays } from "date-fns";
import { getOrgSettings } from "@/features/core";
import { ActionError, createAction } from "@/lib/actions/create-action";
import { toDateKey, todayInIstanbul } from "@/lib/dates";
import { dismissSuggestionSchema } from "../schemas";

const COACH = ["coach", "owner"] as const;

/**
 * "Şimdi değil" (08 §1.6): öneri `suggestions.dismiss_days` gün gizlenir; aynı anahtar varsa
 * süre yenilenir (upsert, `unique nulls not distinct`). Yetki RLS'te (`is_coach_of`,
 * `dismissed_by` oturum sahibi).
 */
export const dismissSuggestion = createAction({
  name: "dismissSuggestion",
  schema: dismissSuggestionSchema,
  roles: COACH,
  revalidate: ["/coach/students", "/coach/plans"],
  handler: async (input, ctx) => {
    const settings = await getOrgSettings();
    const until = toDateKey(addDays(todayInIstanbul(), settings.suggestions.dismiss_days));
    const { error } = await ctx.supabase.from("suggestion_dismissals").upsert(
      {
        student_id: input.studentId,
        dismissed_by: ctx.userId,
        subject_id: input.subjectId,
        topic_id: input.topicId,
        kind: input.kind,
        dismissed_until: until,
      },
      { onConflict: "student_id,subject_id,topic_id,kind" },
    );
    if (error) {
      if (error.code === "42501") throw new ActionError("Bu işlem için yetkin yok.");
      throw error;
    }
    return { dismissedUntil: until };
  },
});
