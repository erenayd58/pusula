import { z } from "zod";
import { toDateKey, todayInIstanbul } from "@/lib/dates";

/**
 * Denemeler zod şemaları (10 §2 Parça 1); form ve Server Action aynı şemayı kullanır.
 * Mesajlar kullanıcıya görünür: Türkçe.
 */

const isoDate = z.iso.date("Tarih gir (YYYY-AA-GG).");
const optionalText = (max: number, label: string) =>
  z
    .string()
    .trim()
    .max(max, `${label} en fazla ${max} karakter.`)
    .transform((v) => (v === "" ? null : v))
    .nullable();

/** Katalog denemesi (koç/owner): başlık 1–80, yayınevi ≤ 60, tarih, ders (null = genel). */
export const mockExamSchema = z.object({
  id: z.uuid("Deneme kimliği geçersiz.").optional(),
  templateId: z.uuid("Şablon seçimi geçersiz."),
  title: z
    .string("Deneme adı gir.")
    .trim()
    .min(1, "Deneme adı gir.")
    .max(80, "Deneme adı en fazla 80 karakter."),
  publisher: optionalText(60, "Yayınevi"),
  /** Form boş alanı `setValueAs` ile null yapar. */
  examDate: isoDate.nullable(),
  /** null = genel deneme; dolu = branş denemesi. */
  subjectId: z.uuid("Ders seçimi geçersiz.").nullable(),
});
export type MockExamInput = z.infer<typeof mockExamSchema>;

export const deleteMockExamSchema = z.object({ id: z.uuid("Deneme kimliği geçersiz.") });

const count = z
  .number("Sayı gir.")
  .int("Tam sayı gir.")
  .min(0, "Negatif olamaz.")
  .max(200, "En fazla 200.");

const optionalNumber = (schema: z.ZodNumber) => schema.nullable();

/**
 * Sonuç kaydı (öğrenci kendi / koç / owner): katalog denemesi ya da serbest başlık; tarih bugün
 * ya da öncesi; ders satırları D/Y/B; konu işaretleri. Soru sayısı sınırı ve şablon uyumu RPC'de.
 */
export const saveMockResultSchema = z
  .object({
    id: z.uuid("Sonuç kimliği geçersiz.").optional(),
    studentId: z.uuid("Öğrenci kimliği geçersiz."),
    mockExamId: z.uuid("Deneme seçimi geçersiz.").nullable(),
    customTitle: optionalText(80, "Deneme adı"),
    /** Katalog dışı branş denemesinin dersi; genel ya da katalog denemesinde null. */
    subjectId: z.uuid("Ders seçimi geçersiz.").nullable(),
    takenOn: isoDate,
    durationMinutes: optionalNumber(
      z.number("Sayı gir.").int("Tam sayı gir.").min(1, "En az 1 dk.").max(600, "En fazla 600 dk."),
    ),
    score: optionalNumber(
      z.number("Sayı gir.").min(0, "Negatif olamaz.").max(999.999, "En fazla 999,999."),
    ),
    percentile: optionalNumber(
      z.number("Sayı gir.").min(0, "0–100 arası gir.").max(100, "0–100 arası gir."),
    ),
    note: optionalText(300, "Not"),
    subjects: z
      .array(
        z.object({
          subjectId: z.uuid("Ders kimliği geçersiz."),
          correct: count,
          wrong: count,
          blank: count,
        }),
      )
      .min(1, "En az bir ders gerekli."),
    topicIds: z.array(z.uuid("Konu kimliği geçersiz.")).max(200, "Çok fazla konu."),
  })
  .superRefine((v, ctx) => {
    if (v.mockExamId === null && v.customTitle === null) {
      ctx.addIssue({ code: "custom", path: ["customTitle"], message: "Deneme adı gir." });
    }
    if (v.mockExamId !== null && v.subjectId !== null) {
      ctx.addIssue({
        code: "custom",
        path: ["subjectId"],
        message: "Katalog denemesinde ders seçilmez.",
      });
    }
    if (v.takenOn > toDateKey(todayInIstanbul())) {
      ctx.addIssue({ code: "custom", path: ["takenOn"], message: "Tarih bugünden sonra olamaz." });
    }
  });
export type SaveMockResultInput = z.infer<typeof saveMockResultSchema>;

export const deleteMockResultSchema = z.object({
  id: z.uuid("Sonuç kimliği geçersiz."),
  studentId: z.uuid("Öğrenci kimliği geçersiz."),
});
export type DeleteMockResultInput = z.infer<typeof deleteMockResultSchema>;
