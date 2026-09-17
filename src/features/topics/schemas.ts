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
