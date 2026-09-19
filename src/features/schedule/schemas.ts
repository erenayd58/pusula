import { z } from "zod";
import { dateRangeKeys } from "@/lib/dates";

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

/**
 * Öğrenci uyanık aralığı (Faz 5b, karar B10): ikisi birlikte boş (kurum varsayılanına dön) ya da
 * dolu ve bitiş > başlangıç. Koç Program sekmesinden yazar.
 */
export const setWakeWindowSchema = z
  .object({
    studentId: z.uuid("Öğrenci kimliği geçersiz."),
    wakeStart: time.nullable(),
    wakeEnd: time.nullable(),
  })
  .superRefine((v, ctx) => {
    if ((v.wakeStart === null) !== (v.wakeEnd === null)) {
      ctx.addIssue({
        code: "custom",
        path: ["wakeEnd"],
        message: "İki saati de gir ya da ikisini de boş bırak.",
      });
    } else if (v.wakeStart !== null && v.wakeEnd !== null && v.wakeEnd <= v.wakeStart) {
      ctx.addIssue({
        code: "custom",
        path: ["wakeEnd"],
        message: "Bitiş başlangıçtan sonra olmalı.",
      });
    }
  });
export type SetWakeWindowInput = z.infer<typeof setWakeWindowSchema>;

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

const dayList = z
  .array(z.number().int().min(1).max(7))
  .min(1, "En az bir gün seç.")
  .max(7, "En fazla 7 gün.")
  .transform((days) => [...new Set(days)].sort((a, b) => a - b));

/**
 * Sabit meşguliyet, birden fazla güne aynı saat ve tür (kısayol: "Hafta içi" → 5 satır).
 * Her gün ayrı satır olur; sonradan tek tek düzenlenir/silinir.
 */
export const addBusySlotsSchema = z
  .object({
    studentId: z.uuid("Öğrenci kimliği geçersiz."),
    days: dayList,
    startsAt: time,
    endsAt: time,
    kind: z.enum(busySlotKindValues, "Tür seç."),
    note,
  })
  .superRefine(endAfterStart);
export type AddBusySlotsInput = z.infer<typeof addBusySlotsSchema>;

/** Meşguliyet formu (istemci): `id` varsa tek gün (düzenleme), yoksa gün listesi (ekleme). */
export const busySlotFormSchema = z
  .object({
    id: z.uuid("Kayıt kimliği geçersiz.").optional(),
    studentId: z.uuid("Öğrenci kimliği geçersiz."),
    days: dayList,
    startsAt: time,
    endsAt: time,
    kind: z.enum(busySlotKindValues, "Tür seç."),
    note,
  })
  .superRefine(endAfterStart);
export type BusySlotFormInput = z.infer<typeof busySlotFormSchema>;

/** Tek seferlik istisna, tarih aralığında en fazla bu kadar gün (her güne ayrı satır). */
export const EXCEPTION_RANGE_MAX_DAYS = 31;

/**
 * Tek seferlik istisna: `allDay` ise saatler yok sayılır ve boş yazılır. Eklemede `untilDate`
 * (isteğe bağlı) verilirse `onDate`…`untilDate` arası her güne ayrı satır yazılır (kısayol:
 * gezi, hastalık); düzenlemede yok sayılır.
 */
export const scheduleExceptionSchema = z
  .object({
    id: z.uuid("Kayıt kimliği geçersiz.").optional(),
    studentId: z.uuid("Öğrenci kimliği geçersiz."),
    onDate: z.iso.date("Tarih YYYY-AA-GG biçiminde olmalı."),
    untilDate: z
      .string()
      .trim()
      .transform((v) => (v === "" ? null : v))
      .nullable()
      .optional(),
    allDay: z.boolean(),
    startsAt: time.nullable(),
    endsAt: time.nullable(),
    title: z.string("Başlık gir.").trim().min(1, "Başlık gir.").max(80, "En fazla 80 karakter."),
    note,
  })
  .superRefine((v, ctx) => {
    if (v.untilDate && !v.id) {
      if (!z.iso.date().safeParse(v.untilDate).success) {
        ctx.addIssue({
          code: "custom",
          path: ["untilDate"],
          message: "Tarih YYYY-AA-GG biçiminde olmalı.",
        });
      } else if (v.untilDate < v.onDate) {
        ctx.addIssue({
          code: "custom",
          path: ["untilDate"],
          message: "Bitiş tarihi başlangıçtan önce olamaz.",
        });
      } else if (
        dateRangeKeys(v.onDate, v.untilDate, EXCEPTION_RANGE_MAX_DAYS).length >
        EXCEPTION_RANGE_MAX_DAYS
      ) {
        ctx.addIssue({
          code: "custom",
          path: ["untilDate"],
          message: `Tek seferde en fazla ${EXCEPTION_RANGE_MAX_DAYS} gün.`,
        });
      }
    }
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
