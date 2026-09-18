import { TZDate } from "@date-fns/tz";
import { addDays, differenceInCalendarDays } from "date-fns";
import { TIME_ZONE, daysSince, toDateKey } from "@/lib/dates";
import { formatCount, formatPossessive, formatSigned, withUnit } from "@/lib/format";

/**
 * Gidişat (09 §2 Parça 2, §3.1 tanımları): bitmiş = completed | mastered (çağıran `done` verir);
 * gecikmiş = hedefi bugün ya da öncesi ve bitmemiş; ileride = bitmiş ve hedefi gelecekte;
 * beklenen = hedefi bugün ya da öncesi olan konular + hedefsiz bitmiş konular; hız = son
 * `windowDays` günde biten × 7 / pencere. Saf; `features/*` import etmez.
 */
export type PaceTopic = {
  topicId: string;
  subjectId: string;
  done: boolean;
  completedAt: string | null;
  targetOn: string | null;
};

export type TopicPace = {
  total: number;
  done: number;
  expectedByToday: number;
  overdue: number;
  ahead: number;
  velocityPerWeek: number;
  projectedDoneByExam: number;
  shortfall: number;
  projectedFinishOn: string | null;
};

export type PaceInput = { today: string; examOn: string | null; windowDays: number };

export function topicPace(topics: readonly PaceTopic[], input: PaceInput): TopicPace {
  const { today } = input;
  const windowDays = Math.max(1, input.windowDays);
  let done = 0;
  let expectedByToday = 0;
  let overdue = 0;
  let ahead = 0;
  let doneInWindow = 0;
  for (const t of topics) {
    const due = t.targetOn !== null && t.targetOn <= today;
    if (t.done) done++;
    if (due || (t.done && t.targetOn === null)) expectedByToday++;
    if (!t.done && due) overdue++;
    if (t.done && t.targetOn !== null && t.targetOn > today) ahead++;
    if (t.done && t.completedAt !== null) {
      const since = daysSince(t.completedAt, today);
      if (since >= 0 && since < windowDays) doneInWindow++;
    }
  }
  const total = topics.length;
  const remaining = total - done;
  const velocityPerWeek = (doneInWindow * 7) / windowDays;

  let projectedDoneByExam = done;
  let shortfall = 0;
  if (input.examOn !== null) {
    const daysToExam = Math.max(
      0,
      differenceInCalendarDays(new TZDate(input.examOn, TIME_ZONE), new TZDate(today, TIME_ZONE)),
    );
    const projected = Math.floor(velocityPerWeek * (daysToExam / 7));
    projectedDoneByExam = Math.min(total, done + projected);
    shortfall = Math.max(0, remaining - projected);
  }

  let projectedFinishOn: string | null = null;
  if (remaining === 0) projectedFinishOn = today;
  else if (velocityPerWeek > 0) {
    const days = Math.ceil(remaining / (velocityPerWeek / 7));
    projectedFinishOn = toDateKey(addDays(new TZDate(today, TIME_ZONE), days));
  }

  return {
    total,
    done,
    expectedByToday,
    overdue,
    ahead,
    velocityPerWeek,
    projectedDoneByExam,
    shortfall,
    projectedFinishOn,
  };
}

/** Aynı hesap, ders alt kümesi. */
export function subjectPace(
  topics: readonly PaceTopic[],
  subjectId: string,
  input: PaceInput,
): TopicPace {
  return topicPace(
    topics.filter((t) => t.subjectId === subjectId),
    input,
  );
}

/**
 * Öğrenci cümlesi ("sen", yargı yok): "54 konunun 9'u bitti · takvimin 3 konu gerisindesin" ·
 * "… ilerisindesin" · "… takvimle uyumlusun"; hedef yoksa yalnızca ilk parça.
 */
export function paceSentence(p: TopicPace, hasTargets: boolean): string {
  const head = `${formatCount(p.total, "konunun")} ${formatPossessive(p.done)} bitti`;
  if (!hasTargets) return head;
  if (p.overdue > 0) return `${head} · takvimin ${formatCount(p.overdue, "konu")} gerisindesin`;
  if (p.ahead > 0) return `${head} · takvimin ${formatCount(p.ahead, "konu")} ilerisindesin`;
  return `${head} · takvimle uyumlusun`;
}

/** K1 "Takvim" sütunu: "−3 konu" · "+2 konu" · "Uyumlu" · "—" (işaret U+2212). */
export function paceLabel(p: Pick<TopicPace, "overdue" | "ahead">, hasTargets: boolean): string {
  if (!hasTargets) return "—";
  if (p.overdue > 0) return withUnit(formatSigned(-p.overdue, 0), "konu");
  if (p.ahead > 0) return withUnit(formatSigned(p.ahead, 0), "konu");
  return "Uyumlu";
}
