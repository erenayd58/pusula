import { TZDate } from "@date-fns/tz";
import { addDays, differenceInCalendarDays } from "date-fns";
import { TIME_ZONE, toDateKey, toIstanbul } from "@/lib/dates";

/**
 * Geri planlama (09-faz5-strateji.md §2 Parça 2, karar B5): tüm ünite konuları (bitmişler dahil)
 * `[startsOn, finishBy]` aralığına gün çözünürlüğünde eşit yayılır. Sıra: okul tarihi dolu olanlar
 * tarih sırasıyla önce, kalanlar dersler arası sıra-sıra (Türkçe 1, Mat 1, Fen 1, …, Türkçe 2, …).
 * Okul kelepçesi: okul tarihi olan konunun hedefi okul tarihinden (haftasından) önce olamaz —
 * `max(yayılım, okul)`, `finishBy` ile sınırlı; sıralama ve diğer konuların yayılımı değişmez. Koç
 * tek tek düzenleyerek yine öne alabilir. Bitmiş konu sıradaki yerini (yuvasını) alır; hedefi
 * `completedAt` varsa o gün (aralığa kırpılır: beklenen sayımına doğal girer, "Hedef yok" satırı
 * kalmaz), yoksa yuvasının tarihi. Saf; `features/*` import etmez.
 */

export type BackPlanTopic = {
  topicId: string;
  subjectId: string;
  subjectSortOrder: number;
  topicSortOrder: number;
  schoolFinishOn: string | null;
  done: boolean;
  /** Bitiş zaman damgası (ISO; `student_topic_progress.completed_at`); bitmemişse ya da yoksa null. */
  completedAt: string | null;
};

export type TopicTargetDate = { topicId: string; targetOn: string };

/** Ders sırası → konu sırası → kimlik (deterministik). */
function bySubjectThenTopic(a: BackPlanTopic, b: BackPlanTopic): number {
  return (
    a.subjectSortOrder - b.subjectSortOrder ||
    a.topicSortOrder - b.topicSortOrder ||
    a.topicId.localeCompare(b.topicId)
  );
}

/** Dersler arası sıra-sıra: her dersin 1. konusu, sonra 2. konuları, … */
function roundRobin(topics: readonly BackPlanTopic[]): BackPlanTopic[] {
  const bySubject = new Map<string, BackPlanTopic[]>();
  for (const t of [...topics].sort(bySubjectThenTopic)) {
    (bySubject.get(t.subjectId) ?? bySubject.set(t.subjectId, []).get(t.subjectId))!.push(t);
  }
  const queues = [...bySubject.values()];
  const out: BackPlanTopic[] = [];
  for (let i = 0; queues.some((q) => i < q.length); i++) {
    for (const q of queues) if (i < q.length) out.push(q[i]!);
  }
  return out;
}

export function backPlanTopics(input: {
  topics: readonly BackPlanTopic[];
  startsOn: string;
  finishBy: string;
}): TopicTargetDate[] {
  if (input.finishBy < input.startsOn) return [];
  const withSchool = input.topics
    .filter((t) => t.schoolFinishOn !== null)
    .sort((a, b) => a.schoolFinishOn!.localeCompare(b.schoolFinishOn!) || bySubjectThenTopic(a, b));
  const ordered = [
    ...withSchool,
    ...roundRobin(input.topics.filter((t) => t.schoolFinishOn === null)),
  ];
  const n = ordered.length;
  if (n === 0) return [];

  const start = new TZDate(input.startsOn, TIME_ZONE);
  const days = differenceInCalendarDays(new TZDate(input.finishBy, TIME_ZONE), start);
  const clampToRange = (date: string) =>
    date < input.startsOn ? input.startsOn : date > input.finishBy ? input.finishBy : date;
  return ordered.map((t, i) => {
    if (t.done && t.completedAt !== null) {
      return { topicId: t.topicId, targetOn: clampToRange(toDateKey(toIstanbul(t.completedAt))) };
    }
    const spread = toDateKey(addDays(start, Math.floor(((i + 1) * days) / n)));
    const clamped =
      t.schoolFinishOn !== null && t.schoolFinishOn > spread
        ? clampToRange(t.schoolFinishOn)
        : spread;
    return { topicId: t.topicId, targetOn: clamped };
  });
}
