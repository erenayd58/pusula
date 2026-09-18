import { z } from "zod";
import { toDateKey, todayInIstanbul } from "@/lib/dates";

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

// Hedef ve geri planlama (Faz 5b, 09 §2 Parça 2) ------------------------------------------------

const isoDate = z.iso.date("Tarih gir (YYYY-AA-GG).");

/**
 * Hedef kurma: bitirme tarihi bugünden sonra (sınav tarihi karşılaştırması eylemde), başlangıç
 * ≤ bitiş, en az bir derste soru > 0; konu hedefleri istemcide `backPlanTopics` ile üretilir.
 */
export const setStudentTargetsSchema = z
  .object({
    studentId: z.uuid("Öğrenci kimliği geçersiz."),
    topicsFinishBy: isoDate,
    startsOn: isoDate,
    subjects: z
      .array(
        z.object({
          subjectId: z.uuid("Ders kimliği geçersiz."),
          questions: z
            .number("Sayı gir.")
            .int("Tam sayı gir.")
            .min(0, "Negatif olamaz.")
            .max(100_000, "En fazla 100.000 soru."),
        }),
      )
      .min(1, "En az bir ders gerekli.")
      .refine((rows) => rows.some((r) => r.questions > 0), {
        message: "En az bir derse soru hedefi gir.",
      }),
    topics: z
      .array(z.object({ topicId: z.uuid("Konu kimliği geçersiz."), targetOn: isoDate }))
      .max(400, "Çok fazla konu."),
  })
  .superRefine((v, ctx) => {
    if (v.topicsFinishBy <= toDateKey(todayInIstanbul())) {
      ctx.addIssue({
        code: "custom",
        path: ["topicsFinishBy"],
        message: "Bitirme tarihi bugünden sonra olmalı.",
      });
    }
    if (v.startsOn > v.topicsFinishBy) {
      ctx.addIssue({
        code: "custom",
        path: ["startsOn"],
        message: "Başlangıç bitirme tarihinden sonra olamaz.",
      });
    }
  });
export type SetStudentTargetsInput = z.infer<typeof setStudentTargetsSchema>;

/** Tek konunun hedef tarihi (RLS ile doğrudan satır güncellemesi). */
export const updateTopicTargetSchema = z.object({
  studentId: z.uuid("Öğrenci kimliği geçersiz."),
  topicId: z.uuid("Konu kimliği geçersiz."),
  targetOn: isoDate,
});
export type UpdateTopicTargetInput = z.infer<typeof updateTopicTargetSchema>;

/** Haftalık hedef önerisini uygulama (karar B13): koçun onayladığı sayı `setGoals`'a gider. */
export const weeklyGoalFromTargetSchema = z.object({
  studentId: z.uuid("Öğrenci kimliği geçersiz."),
  weekly: z
    .number("Sayı gir.")
    .int("Tam sayı gir.")
    .min(1, "En az 1 soru.")
    .max(5000, "En fazla 5.000 soru."),
});
export type WeeklyGoalFromTargetInput = z.infer<typeof weeklyGoalFromTargetSchema>;
