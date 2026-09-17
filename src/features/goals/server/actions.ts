"use server";

import { ActionError, createAction } from "@/lib/actions/create-action";
import { goalPeriodValues, setGoalsSchema } from "../schemas";

const NOT_ALLOWED = "Bu işlem için yetkin yok.";

/**
 * Günlük ve haftalık soru hedefi (koç/owner). Dönem başına tek aktif hedef: varsa güncellenir,
 * yoksa eklenir; boş bırakılan dönemin hedefi pasife alınır. RLS koçu kendi öğrencisiyle sınırlar.
 */
export const setGoals = createAction({
  name: "setGoals",
  schema: setGoalsSchema,
  roles: ["coach", "owner"],
  revalidate: ["/coach/students", "/student/today"],
  handler: async (input, ctx) => {
    const { data: existing, error: readError } = await ctx.supabase
      .from("goals")
      .select("id, period")
      .eq("student_id", input.studentId)
      .eq("is_active", true);
    if (readError) throw readError;
    const byPeriod = new Map(existing.map((g) => [g.period, g.id]));

    for (const period of goalPeriodValues) {
      const target = input[period];
      const id = byPeriod.get(period);
      if (target === null) {
        if (!id) continue;
        const { error } = await ctx.supabase
          .from("goals")
          .update({ is_active: false })
          .eq("id", id);
        if (error) throw error;
      } else if (id) {
        const { error } = await ctx.supabase
          .from("goals")
          .update({ target_value: target })
          .eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await ctx.supabase.from("goals").insert({
          student_id: input.studentId,
          created_by: ctx.userId,
          period,
          target_value: target,
        });
        if (error) {
          if (error.code === "42501") throw new ActionError(NOT_ALLOWED);
          throw error;
        }
      }
    }
    return { daily: input.daily, weekly: input.weekly };
  },
});
