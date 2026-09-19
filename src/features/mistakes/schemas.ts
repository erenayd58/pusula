import { z } from "zod";

/** Depo yolu: {organization_id}/{student_id}/{uuid}.webp|jpg (eylem kurum/öğrenci önekini ayrıca doğrular). */
export const IMAGE_PATH_RE =
  /^[0-9a-f-]{36}\/[0-9a-f-]{36}\/[0-9a-f-]{36}\.(webp|jpg)$/;

export const mistakeReasonValues = [
  "knowledge_gap",
  "attention",
  "time",
  "misread_question",
  "calculation",
  "unknown",
] as const;

const note = z
  .string()
  .trim()
  .max(300, "Not en fazla 300 karakter olabilir.")
  .transform((v) => (v === "" ? null : v))
  .nullable();

/** Yeni kayıt (öğrenci): ders zorunlu; konu, deneme bağı, fotoğraf ve not isteğe bağlı (C7, C9). */
export const createMistakeSchema = z.object({
  subjectId: z.uuid("Ders seçimi geçersiz."),
  topicId: z.uuid("Konu seçimi geçersiz.").nullable(),
  mockResultId: z.uuid("Deneme bağı geçersiz.").nullable(),
  imagePath: z.string().regex(IMAGE_PATH_RE, "Fotoğraf yolu geçersiz.").nullable(),
  reason: z.enum(mistakeReasonValues).default("unknown"),
  note,
});
export type CreateMistakeInput = z.input<typeof createMistakeSchema>;

/** Düzenleme (öğrenci, koç): neden / konu / not. Fotoğraf değiştirilmez (sil + yeniden ekle). */
export const updateMistakeSchema = z.object({
  id: z.uuid("Kayıt kimliği geçersiz."),
  studentId: z.uuid("Öğrenci kimliği geçersiz."),
  subjectId: z.uuid("Ders seçimi geçersiz."),
  topicId: z.uuid("Konu seçimi geçersiz.").nullable(),
  reason: z.enum(mistakeReasonValues),
  note,
});
export type UpdateMistakeInput = z.input<typeof updateMistakeSchema>;

/** "Çözdüm" / geri al. */
export const setMistakeStatusSchema = z.object({
  id: z.uuid("Kayıt kimliği geçersiz."),
  studentId: z.uuid("Öğrenci kimliği geçersiz."),
  solved: z.boolean(),
});

export const deleteMistakeSchema = z.object({
  id: z.uuid("Kayıt kimliği geçersiz."),
  studentId: z.uuid("Öğrenci kimliği geçersiz."),
});
