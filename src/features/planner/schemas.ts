import { z } from "zod";

export const planItemKindValues = ["topic_study", "questions", "review", "link", "custom"] as const;
export const targetUnitValues = ["questions", "minutes"] as const;

const uuid = (msg: string) => z.uuid(msg);
const weekStart = z.iso.date("Hafta YYYY-AA-GG biçiminde olmalı.");
const dayOfWeek = z.number().int().min(1).max(7);
/** null = "bu hafta içinde". */
const dayOrNull = dayOfWeek.nullable();

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `En fazla ${max} karakter.`)
    .transform((v) => (v === "" ? null : v))
    .nullable();

/** Görev alanları (form + eylem ortak). Başlık boşsa sunucu `taskTitle` ile üretir. */
const itemFields = {
  kind: z.enum(planItemKindValues, "Tür seç."),
  title: z.string().trim().max(120, "En fazla 120 karakter."),
  subjectId: uuid("Ders kimliği geçersiz.").nullable(),
  topicId: uuid("Konu kimliği geçersiz.").nullable(),
  url: z
    .string()
    .trim()
    .transform((v) => (v === "" ? null : v))
    .nullable(),
  targetValue: z
    .number("Sayı gir.")
    .int("Tam sayı gir.")
    .min(1, "En az 1.")
    .max(500, "En fazla 500.")
    .nullable(),
  targetUnit: z.enum(targetUnitValues).nullable(),
  estimatedMinutes: z
    .number("Sayı gir.")
    .int("Tam sayı gir.")
    .min(1, "En az 1 dakika.")
    .max(600, "En fazla 600 dakika."),
};

function refineItem(v: z.infer<z.ZodObject<typeof itemFields>>, ctx: z.RefinementCtx) {
  if (v.kind === "link" && !(v.url && /^https?:\/\//.test(v.url))) {
    ctx.addIssue({ code: "custom", path: ["url"], message: "http(s) ile başlayan bir adres gir." });
  }
  if (v.kind === "questions" && !v.targetValue) {
    ctx.addIssue({ code: "custom", path: ["targetValue"], message: "Soru sayısı gir." });
  }
  if ((v.kind === "topic_study" || v.kind === "review" || v.kind === "questions") && !v.subjectId) {
    ctx.addIssue({ code: "custom", path: ["subjectId"], message: "Ders seç." });
  }
}

/** Görev ekleme: birden fazla güne aynı görev (gün çipleri); `null` = bu hafta içinde. */
export const addPlanItemsSchema = z
  .object({
    studentId: uuid("Öğrenci kimliği geçersiz."),
    weekStart,
    days: z.array(dayOrNull).min(1, "En az bir gün seç."),
    ...itemFields,
  })
  .superRefine(refineItem);
export type AddPlanItemsInput = z.infer<typeof addPlanItemsSchema>;

export const updatePlanItemSchema = z
  .object({
    id: uuid("Görev kimliği geçersiz."),
    studentId: uuid("Öğrenci kimliği geçersiz."),
    ...itemFields,
  })
  .superRefine(refineItem);
export type UpdatePlanItemInput = z.infer<typeof updatePlanItemSchema>;

export const planItemIdSchema = z.object({
  id: uuid("Görev kimliği geçersiz."),
  studentId: uuid("Öğrenci kimliği geçersiz."),
});

export const movePlanItemSchema = z.object({
  id: uuid("Görev kimliği geçersiz."),
  studentId: uuid("Öğrenci kimliği geçersiz."),
  dayOfWeek: dayOrNull,
  index: z.number().int().min(0),
});

export const planWeekSchema = z.object({
  studentId: uuid("Öğrenci kimliği geçersiz."),
  weekStart,
});

/** Koç mesajı: plan yoksa taslak açılır (ensurePlan), bu yüzden hafta anahtarıyla gelir. */
export const coachMessageSchema = z.object({
  studentId: uuid("Öğrenci kimliği geçersiz."),
  weekStart,
  message: optionalText(500),
});

/** Kopyalama: kaynak plan → hedef öğrenciler + hafta; `onlyIncomplete` tamamlanmayanları aktarır. */
export const copyPlanSchema = z.object({
  sourcePlanId: uuid("Plan kimliği geçersiz."),
  targetStudentIds: z.array(uuid("Öğrenci kimliği geçersiz.")).min(1, "En az bir öğrenci seç."),
  weekStart,
  onlyIncomplete: z.boolean().default(false),
});

// Öğrenci eylemleri ---------------------------------------------------------------------

export const studentItemSchema = z.object({ id: uuid("Görev kimliği geçersiz.") });

export const itemNoteSchema = z.object({
  id: uuid("Görev kimliği geçersiz."),
  note: z.string().trim().max(200, "En fazla 200 karakter."),
});

export const reflectionSchema = z.object({
  planId: uuid("Plan kimliği geçersiz."),
  text: z.string().trim().max(1000, "En fazla 1000 karakter."),
});
