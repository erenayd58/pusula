import { z } from "zod";

/**
 * `organizations.settings` şeması (08-faz4-plan-sistemi.md §1.2, 09-faz5-strateji.md §1.2).
 * Değerler veritabanında durur (migration `faz4a_org_settings` / `faz5a_strategy_settings`
 * varsayılanları yazar); buradaki `.default()` yalnızca eksik anahtar güvencesidir, eşikler koda
 * gömülmez. Owner formu (`orgSettingsFormSchema`) bu yapıyı yazar.
 */
const timeOfDay = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "SS:DD biçiminde saat gir.");
const dateKey = z.iso.date();

/** Sezon dönemi satırı (karar B2/B14): ad, tarih aralığı, üç yüzde (toplam 100). */
const seasonPeriod = z.object({
  name: z.string().trim().min(1).max(40),
  starts_on: dateKey,
  ends_on: dateKey,
  mix: z.object({
    new_topic: z.number().min(0).max(100),
    weak: z.number().min(0).max(100),
    review: z.number().min(0).max(100),
  }),
});

const accuracyRule = (minQuestions: number, maxAccuracy: number) =>
  z
    .object({
      min_questions: z.number().int().min(1).default(minQuestions),
      max_accuracy: z.number().min(0).max(100).default(maxAccuracy),
    })
    .default({ min_questions: minQuestions, max_accuracy: maxAccuracy });

export const orgSettingsSchema = z.object({
  schedule: z
    .object({
      wake_start: timeOfDay.default("08:00"),
      wake_end: timeOfDay.default("22:00"),
    })
    .default({ wake_start: "08:00", wake_end: "22:00" }),
  planner: z
    .object({
      minutes_per_question: z.number().positive().default(1.5),
      topic_study_minutes: z.number().int().positive().default(40),
      review_minutes: z.number().int().positive().default(20),
      link_minutes: z.number().int().positive().default(15),
      custom_minutes: z.number().int().positive().default(30),
      questions_target: z.number().int().positive().default(20),
      day_capacity_ratio: z.number().min(0.1).max(1).default(0.7),
      max_items_per_subject_per_day: z.number().int().min(1).default(2),
    })
    .prefault({}),
  alerts: z
    .object({
      lookback_days: z.number().int().min(7).default(60),
      knowledge_gap: accuracyRule(40, 55),
      low_accuracy: accuracyRule(20, 60),
      review_due_days: z.array(z.number().int().positive()).min(1).default([7, 15, 30]),
      forgetting_risk: z
        .object({
          min_accuracy: z.number().min(0).max(100).default(60),
          idle_days: z.number().int().min(1).default(21),
        })
        .default({ min_accuracy: 60, idle_days: 21 }),
      stale_days: z.number().int().min(1).default(45),
      neglected_subject_days: z.number().int().min(1).default(10),
      /** Kurulum uyarısı "hiç soru kaydı yok": hesap bu kadar günden eskiyse. */
      setup_account_days: z.number().int().min(1).default(7),
    })
    .prefault({}),
  suggestions: z
    .object({
      max_per_student: z.number().int().min(1).default(5),
      dismiss_days: z.number().int().min(1).default(14),
    })
    .prefault({}),
  strategy: z
    .object({
      /** Boş liste = Faz 4 davranışı (karışım kotası yok). */
      periods: z.array(seasonPeriod).max(6).default([]),
      proximity_days: z.number().int().min(1).default(120),
      school_lag_weeks: z.number().int().min(0).default(2),
      topic_minutes_default: z.number().int().min(1).default(90),
      pace_window_days: z.number().int().min(7).default(28),
      topics_finish_weeks_before_exam: z.number().int().min(0).default(8),
    })
    .prefault({}),
});

export type OrgSettings = z.infer<typeof orgSettingsSchema>;

/** Bilinmeyen/bozuk JSON'da bile geçerli bir ayar nesnesi döner (eksik anahtarlar varsayılan). */
export function parseOrgSettings(raw: unknown): OrgSettings {
  const result = orgSettingsSchema.safeParse(raw ?? {});
  return result.success ? result.data : orgSettingsSchema.parse({});
}
