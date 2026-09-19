import { z } from "zod";
import { MAX_SECTIONS_PER_BATCH } from "@/lib/resources/sections";

export const resourceTypeValues = [
  "lecture_book",
  "question_bank",
  "worksheet",
  "booklet",
  "mock_book",
  "other",
] as const;

/** Kitap başına en fazla test (RPC `too_many_sections` ile aynı sınır). */
export const MAX_SECTIONS_PER_RESOURCE = 400;

const optionalText = (max: number, label: string) =>
  z
    .string()
    .trim()
    .max(max, `${label} en fazla ${max} karakter olabilir.`)
    .transform((v) => (v === "" ? null : v))
    .nullable();

const optionalInt = (min: number, max: number, message: string) =>
  z.number(message).int(message).min(min, message).max(max, message).nullable();

/** Kitap alanları (yeni ve düzenleme). */
const resourceFields = {
  title: z
    .string()
    .trim()
    .min(1, "Kitap adını yaz.")
    .max(120, "Ad en fazla 120 karakter olabilir."),
  publisher: optionalText(60, "Yayınevi"),
  publishYear: optionalInt(2000, 2100, "Yıl 2000–2100 arasında olmalı."),
  type: z.enum(resourceTypeValues, "Tür seç."),
  /** null = çok dersli kitap. */
  subjectId: z.uuid("Ders seçimi geçersiz.").nullable(),
};

/**
 * Toplu test partisi: "Test 1 – 40, her biri 20 soru", sayfa aralığı isteğe bağlı. Çok dersli
 * kitapta parti dersi zorunlu (eylem denetler).
 */
export const sectionBatchSchema = z
  .object({
    prefix: z.string().trim().max(20, "Önek en fazla 20 karakter.").default("Test"),
    from: z.number("Başlangıç numarası gir.").int().min(1, "En az 1."),
    to: z.number("Bitiş numarası gir.").int().min(1, "En az 1."),
    questionCount: optionalInt(1, 200, "Soru sayısı 1–200 arasında olmalı."),
    pageStart: optionalInt(1, 9999, "Sayfa 1'den küçük olamaz."),
    pagesPerSection: optionalInt(1, 999, "Test başına sayfa 1'den küçük olamaz."),
    subjectId: z.uuid("Ders seçimi geçersiz.").nullable(),
  })
  .superRefine((v, ctx) => {
    if (v.to < v.from) {
      ctx.addIssue({ code: "custom", path: ["to"], message: "Bitiş başlangıçtan küçük olamaz." });
    } else if (v.to - v.from + 1 > MAX_SECTIONS_PER_BATCH) {
      ctx.addIssue({
        code: "custom",
        path: ["to"],
        message: `Bir partide en fazla ${MAX_SECTIONS_PER_BATCH} test.`,
      });
    }
  });
export type SectionBatchInput = z.input<typeof sectionBatchSchema>;

/** Yeni kitap: alanlar + partiler (tek RPC). Öğrenci çağırırsa özel kaynak + kendine atama. */
export const createResourceSchema = z
  .object({
    ...resourceFields,
    templateId: z.uuid("Şablon seçimi geçersiz."),
    batches: z.array(sectionBatchSchema).max(10, "En fazla 10 parti."),
  })
  .superRefine((v, ctx) => {
    const total = v.batches.reduce((s, b) => s + Math.max(0, b.to - b.from + 1), 0);
    if (total > MAX_SECTIONS_PER_RESOURCE) {
      ctx.addIssue({
        code: "custom",
        path: ["batches"],
        message: `Bir kitapta en fazla ${MAX_SECTIONS_PER_RESOURCE} test.`,
      });
    }
    if (v.subjectId === null && v.batches.some((b) => b.subjectId === null)) {
      ctx.addIssue({
        code: "custom",
        path: ["batches"],
        message: "Çok dersli kitapta her parti için ders seç.",
      });
    }
  });
export type CreateResourceInput = z.input<typeof createResourceSchema>;

/** Form (yeni + düzenleme tek tip): düzenlemede `id` dolu ve `batches` boş. */
export const resourceFormSchema = createResourceSchema.safeExtend({
  id: z.uuid("Kaynak kimliği geçersiz.").optional(),
});
export type ResourceFormInput = z.input<typeof resourceFormSchema>;

export const updateResourceSchema = z.object({
  id: z.uuid("Kaynak kimliği geçersiz."),
  ...resourceFields,
});
export type UpdateResourceInput = z.input<typeof updateResourceSchema>;

export const resourceIdSchema = z.object({ id: z.uuid("Kaynak kimliği geçersiz.") });

/** Mevcut kitaba parti ekleme. */
export const addSectionsSchema = z.object({
  resourceId: z.uuid("Kaynak kimliği geçersiz."),
  batch: sectionBatchSchema,
});
export type AddSectionsInput = z.input<typeof addSectionsSchema>;

/** Tek test düzenleme. */
export const updateSectionSchema = z.object({
  id: z.uuid("Test kimliği geçersiz."),
  resourceId: z.uuid("Kaynak kimliği geçersiz."),
  title: z.string().trim().min(1, "Başlık yaz.").max(60, "Başlık en fazla 60 karakter."),
  subjectId: z.uuid("Ders seçimi geçersiz.").nullable(),
  topicId: z.uuid("Konu seçimi geçersiz.").nullable(),
  questionCount: optionalInt(1, 200, "Soru sayısı 1–200 arasında olmalı."),
  pageStart: optionalInt(1, 9999, "Sayfa 1'den küçük olamaz."),
  pageEnd: optionalInt(1, 9999, "Sayfa 1'den küçük olamaz."),
});
export type UpdateSectionInput = z.input<typeof updateSectionSchema>;

export const sectionIdSchema = z.object({
  id: z.uuid("Test kimliği geçersiz."),
  resourceId: z.uuid("Kaynak kimliği geçersiz."),
});

export const moveSectionSchema = sectionIdSchema.extend({ direction: z.enum(["up", "down"]) });

/** Seçili testleri bir konuya eşle (null = eşlemeyi kaldır). */
export const setSectionTopicsSchema = z.object({
  resourceId: z.uuid("Kaynak kimliği geçersiz."),
  sectionIds: z.array(z.uuid()).min(1, "En az bir test seç.").max(400),
  topicId: z.uuid("Konu seçimi geçersiz.").nullable(),
});

/** Koç: birden fazla öğrenciye tek tıkla. */
export const assignResourceSchema = z.object({
  resourceId: z.uuid("Kaynak kimliği geçersiz."),
  studentIds: z.array(z.uuid()).min(1, "En az bir öğrenci seç.").max(100),
});

export const unassignResourceSchema = z.object({
  resourceId: z.uuid("Kaynak kimliği geçersiz."),
  studentId: z.uuid("Öğrenci kimliği geçersiz."),
});
