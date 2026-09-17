import { z } from "zod";

export const goalPeriodValues = ["daily", "weekly"] as const;

const target = z
  .number("Sayı gir.")
  .int("Tam sayı gir.")
  .min(1, "En az 1 soru.")
  .max(5000, "En fazla 5.000 soru.")
  .nullable();

/** Koç formu: boş bırakılan dönem hedefsiz kalır (varsa pasife alınır). */
export const setGoalsSchema = z.object({
  studentId: z.uuid("Öğrenci kimliği geçersiz."),
  daily: target,
  weekly: target,
});
export type SetGoalsInput = z.infer<typeof setGoalsSchema>;
