import { formatDuration } from "@/lib/format";

/**
 * Gerçekçilik (09 §2 Parça 2): hedefin haftada gerektirdiği çalışma süresi ile programdaki boş
 * süre. Yargı yok, iki sayı ve "sığıyor / sığmıyor". Saf; hafta tabanı en az 1.
 */
export type FeasibilityInput = {
  /** Σ bitmemiş konu (`estimated_minutes ?? topic_minutes_default`). */
  remainingTopicMinutes: number;
  /** Bugün → `topics_finish_by` (en az 1). */
  weeksToFinish: number;
  /** Σ hedef − gerçekleşen (negatifse 0). */
  remainingQuestions: number;
  /** Kurum `planner.minutes_per_question` (Parça 2'de kurum değeri). */
  minutesPerQuestion: number;
  /** Bugün → `exam_date` (en az 1). */
  weeksToExam: number;
  /** İstisnasız hafta × `day_capacity_ratio`. */
  weeklyAvailableMinutes: number;
};

export type Feasibility = {
  requiredMinutesPerWeek: number;
  availableMinutesPerWeek: number;
  fits: boolean;
};

export function feasibility(input: FeasibilityInput): Feasibility {
  const weeksToFinish = Math.max(1, input.weeksToFinish);
  const weeksToExam = Math.max(1, input.weeksToExam);
  const topicMinutes = Math.max(0, input.remainingTopicMinutes) / weeksToFinish;
  const questionMinutes =
    (Math.max(0, input.remainingQuestions) * Math.max(0, input.minutesPerQuestion)) / weeksToExam;
  const required = Math.round(topicMinutes + questionMinutes);
  const available = Math.max(0, Math.round(input.weeklyAvailableMinutes));
  return {
    requiredMinutesPerWeek: required,
    availableMinutesPerWeek: available,
    fits: required <= available,
  };
}

/**
 * "Bu hedef programa sığıyor: haftada yaklaşık 9 sa gerekiyor, 12 sa boş var." /
 * "Bu hedef haftada yaklaşık 18 sa çalışma gerektiriyor; öğrencinin programında haftada 12 sa boş var."
 */
export function feasibilityText(f: Feasibility): string {
  const required = formatDuration(f.requiredMinutesPerWeek);
  const available = formatDuration(f.availableMinutesPerWeek);
  return f.fits
    ? `Bu hedef programa sığıyor: haftada yaklaşık ${required} gerekiyor, ${available} boş var.`
    : `Bu hedef haftada yaklaşık ${required} çalışma gerektiriyor; öğrencinin programında haftada ${available} boş var.`;
}
