import { z } from "zod";

/**
 * Bildirim `data` olguları (12 §3.1): tetikleyici ve cron yalnızca bunları yazar, metin
 * `lib/text.ts`'de üretilir. `safeParse` ile okunur; bozuk veri nötr "Bildirim" satırına düşer.
 */
const dateKey = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const planPublishedData = z.object({
  plan_id: z.uuid(),
  week_start: dateKey,
  items_count: z.number().int().min(0),
  has_message: z.boolean(),
});

export const noteAddedData = z.object({
  note_id: z.uuid(),
  author_name: z.string().nullable(),
  excerpt: z.string(),
});

export const announcementData = z.object({
  announcement_id: z.uuid(),
  title: z.string(),
  body: z.string(),
});

export const mockResultAddedData = z.object({
  result_id: z.uuid(),
  taken_on: dateKey,
  title: z.string().nullable(),
  is_branch: z.boolean(),
});

export const studentNoteData = z.object({
  kind: z.enum(["item", "reflection"]),
  plan_id: z.uuid(),
  week_start: dateKey,
  item_id: z.uuid().optional(),
  item_title: z.string().optional(),
  excerpt: z.string(),
});

export const reviewDueData = z.object({
  count: z.number().int().min(0),
  topics: z.array(z.string()).default([]),
});

export const studentInactiveData = z.object({ days: z.number().int().min(0) });

/** Öğrenci ve veli haftalık özeti (student_id dolu). */
export const weeklySummaryStudentData = z.object({
  week_start: dateKey,
  questions: z.number().int().min(0),
  study_minutes: z.number().int().min(0),
  plan_total: z.number().int().nullable(),
  plan_done: z.number().int().nullable(),
  plan_percent: z.number().nullable(),
  topics_done: z.number().int().min(0),
  last_net: z.number().nullable(),
});

/** Koç haftalık özeti (student_id null). */
export const weeklySummaryCoachData = z.object({
  week_start: dateKey,
  students: z.array(
    z.object({
      student_id: z.uuid(),
      name: z.string(),
      questions: z.number().int().min(0),
      plan_percent: z.number().nullable(),
    }),
  ),
  totals: z.object({
    students: z.number().int().min(0),
    questions: z.number().int().min(0),
    plan_percent_avg: z.number().nullable(),
  }),
});

// Eylemler ------------------------------------------------------------------------------------

export const markReadSchema = z.object({ id: z.uuid() });

/** Tercihler: tür → açık mı (yalnızca kapalı olanlar saklanır). */
export const notificationPrefsSchema = z.partialRecord(
  z.enum([
    "plan_published",
    "note_added",
    "announcement",
    "mock_result_added",
    "student_note",
    "review_due",
    "student_inactive",
    "weekly_summary",
  ]),
  z.boolean(),
);
export type NotificationPrefs = z.infer<typeof notificationPrefsSchema>;

export const setNotificationPrefsSchema = z.object({ prefs: notificationPrefsSchema });
export type SetNotificationPrefsInput = z.infer<typeof setNotificationPrefsSchema>;
