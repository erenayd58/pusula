import { z } from "zod";
import { toDateKey, todayInIstanbul } from "@/lib/dates";

export const QUESTION_MAX = 500;

const count = z.number("Sayı gir.").int("Tam sayı gir.").min(0, "Eksi olamaz.").max(QUESTION_MAX);

const logFields = {
  studentId: z.uuid("Öğrenci kimliği geçersiz."),
  subjectId: z.uuid("Ders seç."),
  topicId: z.uuid("Konu kimliği geçersiz.").nullable(),
  correct: count,
  wrong: count,
  blank: count,
  durationMinutes: z
    .number("Sayı gir.")
    .int("Tam sayı gir.")
    .min(1, "En az 1 dakika.")
    .max(600, "En fazla 600 dakika.")
    .nullable(),
};

/** Toplam = doğru + yanlış + boş; 1–500 arasında olmalı. */
function withTotal<T extends z.ZodObject<typeof logFields>>(schema: T) {
  return schema.superRefine((v, ctx) => {
    const total = v.correct + v.wrong + v.blank;
    if (total < 1) {
      ctx.addIssue({ code: "custom", path: ["correct"], message: "En az 1 soru gir." });
    } else if (total > QUESTION_MAX) {
      ctx.addIssue({
        code: "custom",
        path: ["correct"],
        message: `Bir kayıtta en fazla ${QUESTION_MAX} soru.`,
      });
    }
  });
}

/**
 * Yeni kayıt: tarih istemciden gelmez, sunucu İstanbul bugününü atar. `planItemId` doluysa
 * kayıt plan görevini tamamlar (Faz 4b, `complete_plan_item` RPC'si, tek transaction).
 */
export const createQuestionLogSchema = withTotal(
  z.object({ ...logFields, planItemId: z.uuid("Görev kimliği geçersiz.").nullable().optional() }),
);
export type CreateQuestionLogInput = z.infer<typeof createQuestionLogSchema>;

/** Düzenleme: tarih değişebilir ama gelecek olamaz (veritabanı check'i de var). */
export const updateQuestionLogSchema = withTotal(
  z.object({
    ...logFields,
    id: z.uuid("Kayıt kimliği geçersiz."),
    logDate: z.iso
      .date("Tarih YYYY-AA-GG biçiminde olmalı.")
      .refine((d) => d <= toDateKey(todayInIstanbul()), "Gelecek tarihe kayıt girilemez."),
  }),
);
export type UpdateQuestionLogInput = z.infer<typeof updateQuestionLogSchema>;

export const deleteQuestionLogSchema = z.object({
  id: z.uuid("Kayıt kimliği geçersiz."),
});
