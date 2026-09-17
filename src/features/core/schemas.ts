import { z } from "zod";
import { USERNAME_PATTERN, USERNAME_RULE_MESSAGE } from "@/lib/auth/username";
import { isWellFormedInvitationCode, normalizeInvitationCode } from "@/lib/invitations/code";

export const INVITATION_CODE_MESSAGE = "Davet kodu 8 karakterdir; harf ve rakamlardan oluşur.";
/** Kod hatalı, süresi dolmuş ya da kullanılmışsa hep aynı mesaj (durum sızdırılmaz). */
export const INVITATION_INVALID = "Davet kodu geçersiz veya süresi dolmuş.";

/**
 * Çekirdek modül zod şemaları; form ve Server Action aynı şemayı kullanır (CLAUDE.md "Kod Stili").
 * Mesajlar kullanıcıya görünür: Türkçe.
 */

export const loginSchema = z.object({
  identifier: z.string().trim().min(1, "Kullanıcı adını veya e-postanı yaz."),
  password: z.string().min(1, "Şifreni yaz."),
});
export type LoginInput = z.infer<typeof loginSchema>;

const seasonPattern = /^\d{4}-\d{4}$/;

export const createStudentSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, "Ad soyad en az 2 karakter olmalı.")
    .max(80, "Ad soyad en fazla 80 karakter."),
  username: z.string().trim().regex(USERNAME_PATTERN, USERNAME_RULE_MESSAGE),
  temporaryPassword: z
    .string()
    .min(8, "Geçici şifre en az 8 karakter olmalı.")
    .max(72, "Geçici şifre en fazla 72 karakter."),
  season: z.string().trim().regex(seasonPattern, "Sezon 2026-2027 biçiminde olmalı."),
  examDate: z.iso.date("Sınav tarihi YYYY-AA-GG biçiminde olmalı."),
  curriculumTemplateId: z.uuid("Konu listesi (şablon) seçimi geçersiz."),
  /** Sadece owner seçer; koç için boş bırakılır ve kendisi atanır. */
  coachId: z.uuid("Koç seçimi geçersiz.").optional(),
});
export type CreateStudentInput = z.infer<typeof createStudentSchema>;

export const studentIdSchema = z.object({
  studentId: z.uuid("Öğrenci kimliği geçersiz."),
});

export const resetStudentPasswordSchema = studentIdSchema.extend({
  newPassword: z
    .string()
    .min(8, "Yeni şifre en az 8 karakter olmalı.")
    .max(72, "Yeni şifre en fazla 72 karakter."),
});

export const updateExamDateSchema = studentIdSchema.extend({
  examDate: z.iso.date("Sınav tarihi YYYY-AA-GG biçiminde olmalı."),
});
export type UpdateExamDateInput = z.infer<typeof updateExamDateSchema>;

export const assignCoachSchema = studentIdSchema.extend({
  coachId: z.uuid("Koç seçimi geçersiz."),
});

// Veli daveti ve kaydı ------------------------------------------------------------------

export const parentRelationValues = ["mother", "father", "guardian", "other"] as const;

const invitationCode = z
  .string()
  .transform((v) => normalizeInvitationCode(v))
  .refine(isWellFormedInvitationCode, INVITATION_CODE_MESSAGE);

export const invitationCodeSchema = z.object({ code: invitationCode });

export const registerParentSchema = z.object({
  code: invitationCode,
  fullName: z
    .string()
    .trim()
    .min(2, "Ad soyad en az 2 karakter olmalı.")
    .max(80, "Ad soyad en fazla 80 karakter."),
  email: z.email("Geçerli bir e-posta adresi yazın.").transform((v) => v.trim().toLowerCase()),
  password: z
    .string()
    .min(8, "Şifre en az 8 karakter olmalı.")
    .max(72, "Şifre en fazla 72 karakter."),
  relation: z.enum(parentRelationValues, "Yakınlık seçin."),
});
export type RegisterParentInput = z.infer<typeof registerParentSchema>;

export const acceptInvitationSchema = z.object({
  code: invitationCode,
  /** Profili olmayan kullanıcı için zorunlu; mevcut veli için yok sayılır. */
  fullName: z.string().trim().max(80, "Ad soyad en fazla 80 karakter.").optional(),
  relation: z.enum(parentRelationValues, "Yakınlık seçin."),
});

export const giveConsentSchema = z.object({
  studentIds: z.array(z.uuid()).min(1, "Onay verilecek öğrenci bulunamadı."),
  accepted: z.literal(true, "Devam etmek için onay kutusunu işaretleyin."),
});

/** Koçun kâğıt üzerinde alınan veli onayını işlemesi (consents.recorded_by). */
export const recordPaperConsentSchema = studentIdSchema.extend({
  givenAt: z.iso.date("Onay tarihi YYYY-AA-GG biçiminde olmalı."),
  documentVersion: z
    .string()
    .trim()
    .min(1, "Belge sürümünü yaz.")
    .max(40, "Belge sürümü en fazla 40 karakter."),
});
export type RecordPaperConsentInput = z.infer<typeof recordPaperConsentSchema>;

/**
 * Kurum ayarı formu (08 §1.2, karar A5): owner sayı alanlarını düzenler. `orgSettingsSchema`
 * (lib/org-settings) eksik anahtar güvencesidir; bu şema formun tam ve Türkçe mesajlı halidir,
 * çıktısı `OrgSettings` ile aynı yapıdadır. Form ve `updateOrgSettings` aynı şemayı kullanır.
 */
const timeOfDay = z
  .string("Saat gir.")
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "SS:DD biçiminde saat gir.");
const int = (min: number) =>
  z.number("Sayı gir.").int("Tam sayı gir.").min(min, `En az ${min} olmalı.`);
const percent = z.number("Sayı gir.").min(0, "0–100 arası gir.").max(100, "0–100 arası gir.");
const accuracyRule = z.object({ min_questions: int(1), max_accuracy: percent });

export const orgSettingsFormSchema = z.object({
  schedule: z
    .object({ wake_start: timeOfDay, wake_end: timeOfDay })
    .refine((v) => v.wake_end > v.wake_start, {
      message: "Bitiş başlangıçtan sonra olmalı.",
      path: ["wake_end"],
    }),
  planner: z.object({
    minutes_per_question: z.number("Sayı gir.").positive("Sıfırdan büyük olmalı."),
    topic_study_minutes: int(1),
    review_minutes: int(1),
    link_minutes: int(1),
    custom_minutes: int(1),
    questions_target: int(1),
    day_capacity_ratio: z
      .number("Sayı gir.")
      .min(0.1, "0,1 ile 1 arası gir.")
      .max(1, "0,1 ile 1 arası gir."),
    max_items_per_subject_per_day: int(1),
  }),
  alerts: z.object({
    lookback_days: int(7),
    knowledge_gap: accuracyRule,
    low_accuracy: accuracyRule,
    review_due_days: z.array(int(1)).min(1, "En az bir gün gir (ör. 7, 15, 30)."),
    forgetting_risk: z.object({ min_accuracy: percent, idle_days: int(1) }),
    stale_days: int(1),
    neglected_subject_days: int(1),
  }),
  suggestions: z.object({ max_per_student: int(1), dismiss_days: int(1) }),
});
export type OrgSettingsFormInput = z.infer<typeof orgSettingsFormSchema>;
