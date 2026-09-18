import { z } from "zod";

export const topicStatusValues = [
  "not_started",
  "studying",
  "completed",
  "needs_review",
  "mastered",
] as const;

export const setTopicProgressSchema = z.object({
  studentId: z.uuid("Öğrenci kimliği geçersiz."),
  topicId: z.uuid("Konu kimliği geçersiz."),
  status: z.enum(topicStatusValues, "Durum seç."),
  /** 1-5; boş bırakılabilir. */
  confidence: z.number().int().min(1).max(5).nullable(),
});
export type SetTopicProgressInput = z.infer<typeof setTopicProgressSchema>;

const topicName = z
  .string()
  .trim()
  .min(2, "Konu adı en az 2 karakter olmalı.")
  .max(120, "Konu adı en fazla 120 karakter.");

export const addTopicSchema = z.object({
  subjectId: z.uuid("Ders kimliği geçersiz."),
  name: topicName,
});
export type AddTopicInput = z.infer<typeof addTopicSchema>;

export const renameTopicSchema = z.object({
  topicId: z.uuid("Konu kimliği geçersiz."),
  name: topicName,
});

export const topicIdSchema = z.object({ topicId: z.uuid("Konu kimliği geçersiz.") });

export const moveTopicSchema = topicIdSchema.extend({
  direction: z.enum(["up", "down"]),
});

/**
 * Okul takvimi (Faz 5a, 09 §2 Parça 1): konu → okulda tahmini bitiş tarihi (null temizler).
 * Tek satır düzenlemesi ve "Sıradan dağıt" aynı eylemi kullanır; en fazla 100 satır.
 */
export const setTopicSchoolDatesSchema = z.object({
  rows: z
    .array(
      z.object({
        topicId: z.uuid("Konu kimliği geçersiz."),
        schoolFinishOn: z.iso.date("Tarih YYYY-AA-GG biçiminde olmalı.").nullable(),
      }),
    )
    .min(1, "En az bir konu gerekli.")
    .max(100, "Tek seferde en fazla 100 konu.")
    .refine((rows) => new Set(rows.map((r) => r.topicId)).size === rows.length, {
      message: "Aynı konu birden fazla kez verilemez.",
    }),
});
export type SetTopicSchoolDatesInput = z.infer<typeof setTopicSchoolDatesSchema>;
