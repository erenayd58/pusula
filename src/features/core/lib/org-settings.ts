import { z } from "zod";

/**
 * `organizations.settings` şeması (08-faz4-plan-sistemi.md §1.2, 09-faz5-strateji.md §1.2,
 * 10-faz6-denemeler.md §1.2). Değerler veritabanında durur (migration `faz4a_org_settings` /
 * `faz5a_strategy_settings` / `faz6a_mock_settings` / `faz8c_student_alerts` varsayılanları yazar); buradaki `.default()` yalnızca eksik anahtar güvencesidir, eşikler koda
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
  mock_exams: z
    .object({
      /** "Son N deneme" penceresi (konu işareti sayımı, ders yanlış toplamı, deneme açığı). */
      recent_count: z.number().int().min(1).default(3),
      /** Son N genel denemenin en az bu kadarında işaretlenen konu `mock_weak` üretir (Parça 2). */
      weak_min_marks: z.number().int().min(1).default(2),
      /** Yanlış defterinde pencere içinde bu kadar kayıt açılan konu da `mock_weak` üretir (Parça 2). */
      weak_min_mistakes: z.number().int().min(1).default(3),
      /** `subjectGap = (1 − w) × soruAçığı + w × denemeAçığı` (Parça 2). */
      gap_weight: z.number().min(0).max(1).default(0.5),
    })
    .prefault({}),
  /** Öğrenci düzeyi koç uyarıları (Faz 8, 12 §1.3; 01 §7). Kurallar `features/analytics/lib/student-alerts.ts`. */
  student_alerts: z
    .object({
      /** Son kayıttan bu yana bu kadar gün geçtiyse "hareketsiz". */
      inactivity_days: z.number().int().min(1).default(3),
      /** Haftanın bu gününden (ISO; 3 = çarşamba) itibaren haftalık hedefin yüzdesi eşiğin altındaysa "hedef geride". */
      goal_behind: z
        .object({
          from_isodow: z.number().int().min(1).max(7).default(3),
          min_percent: z.number().min(0).max(100).default(40),
        })
        .default({ from_isodow: 3, min_percent: 40 }),
      /** Son genel deneme öncekinden bu kadar net düşükse "net düşüşü" (E7). */
      net_drop: z.number().min(0).default(5),
      /** Geçen haftanın plan uyumu bu yüzdenin altındaysa "plan uyumu düşük". */
      low_plan_percent: z.number().min(0).max(100).default(50),
      /** Vadesi geçmiş tekrar sayısı bunu aşarsa "birikmiş tekrar". */
      overdue_reviews_max: z.number().int().min(0).default(15),
      /** Hareketsizlik bildirimi (cron) aynı öğrenci için en erken bu kadar günde bir. */
      inactivity_notify_days: z.number().int().min(1).default(7),
    })
    .prefault({}),
});

export type OrgSettings = z.infer<typeof orgSettingsSchema>;

/** Bilinmeyen/bozuk JSON'da bile geçerli bir ayar nesnesi döner (eksik anahtarlar varsayılan). */
export function parseOrgSettings(raw: unknown): OrgSettings {
  const result = orgSettingsSchema.safeParse(raw ?? {});
  return result.success ? result.data : orgSettingsSchema.parse({});
}
