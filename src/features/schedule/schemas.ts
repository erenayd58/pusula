import { z } from "zod";

export const busySlotKindValues = [
  "school",
  "tutoring_center",
  "private_lesson",
  "course",
  "other",
] as const;

const time = z
  .string("Saat gir.")
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Saat SS:DD biçiminde olmalı.");

const note = z
  .string()
  .trim()
  .max(120, "En fazla 120 karakter.")
  .transform((v) => (v === "" ? null : v))
  .nullable();

/** Bitiş başlangıçtan sonra olmalı (veritabanı check'i de var). */
function endAfterStart<T extends { startsAt: string; endsAt: string }>(v: T, ctx: z.RefinementCtx) {
  if (v.endsAt <= v.startsAt) {
    ctx.addIssue({ code: "custom", path: ["endsAt"], message: "Bitiş başlangıçtan sonra olmalı." });
  }
}

/** Sabit meşguliyet: `id` varsa güncelleme, yoksa ekleme. */
export const busySlotSchema = z
  .object({
    id: z.uuid("Kayıt kimliği geçersiz.").optional(),
    studentId: z.uuid("Öğrenci kimliği geçersiz."),
    dayOfWeek: z.number("Gün seç.").int().min(1, "Gün seç.").max(7, "Gün seç."),
    startsAt: time,
    endsAt: time,
    kind: z.enum(busySlotKindValues, "Tür seç."),
    note,
  })
  .superRefine(endAfterStart);
export type BusySlotInput = z.infer<typeof busySlotSchema>;

/** Tek seferlik istisna: `allDay` ise saatler yok sayılır ve boş yazılır. */
export const scheduleExceptionSchema = z
  .object({
    id: z.uuid("Kayıt kimliği geçersiz.").optional(),
    studentId: z.uuid("Öğrenci kimliği geçersiz."),
    onDate: z.iso.date("Tarih YYYY-AA-GG biçiminde olmalı."),
    allDay: z.boolean(),
    startsAt: time.nullable(),
    endsAt: time.nullable(),
    title: z.string("Başlık gir.").trim().min(1, "Başlık gir.").max(80, "En fazla 80 karakter."),
    note,
  })
  .superRefine((v, ctx) => {
    if (v.allDay) return;
    if (!v.startsAt) ctx.addIssue({ code: "custom", path: ["startsAt"], message: "Saat gir." });
    if (!v.endsAt) ctx.addIssue({ code: "custom", path: ["endsAt"], message: "Saat gir." });
    if (v.startsAt && v.endsAt) endAfterStart({ startsAt: v.startsAt, endsAt: v.endsAt }, ctx);
  });
export type ScheduleExceptionInput = z.infer<typeof scheduleExceptionSchema>;

export const deleteScheduleRowSchema = z.object({
  id: z.uuid("Kayıt kimliği geçersiz."),
  studentId: z.uuid("Öğrenci kimliği geçersiz."),
});
