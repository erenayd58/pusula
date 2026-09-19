import type { TopicAlert } from "@/features/analytics";
import { taskTitle } from "@/lib/plan/task-title";
import type { TopicAlertKind } from "@/types";
import type { TaskPoolItem } from "../types";
import { estimateMinutes, type PlannerDefaults } from "./estimate";

/**
 * Kaynak testleri ve videolar → havuz öğesi (11 §3.1–3.2). Saf: görünüm satırlarını yapısal tip
 * olarak alır (`v_student_resource_sections`, `v_student_playlist_videos`); analytics'ten yalnızca
 * `TopicAlert` tipi. Konu eşleşmesi zayıf/gecikmiş uyarıda olan öğeler öne çıkar (`rankByAlerts`).
 */

/** Uyarı türü öncelikleri (`KIND_PRIORITY` ile aynı sıra; küçük önce). */
const ALERT_RANK: Record<TopicAlertKind, number> = {
  knowledge_gap: 0,
  low_accuracy: 1,
  mock_weak: 2,
  behind_school: 3,
  neglected_subject: 4,
  forgetting_risk: 5,
  review_due: 6,
  stale: 7,
  not_started: 8,
};

/** Havuz kategorisi başına en fazla öğe (arama havuzda var). */
export const MEDIA_POOL_LIMIT = 40;

/** Uyarılardan konu → öncelik haritası (aynı konuda en küçük sıra). */
export function alertPriorityByTopic(alerts: readonly TopicAlert[]): Map<string, number> {
  const out = new Map<string, number>();
  for (const a of alerts) {
    if (!a.topicId) continue;
    const rank = ALERT_RANK[a.kind];
    const prev = out.get(a.topicId);
    if (prev === undefined || rank < prev) out.set(a.topicId, rank);
  }
  return out;
}

/** Eşleşen konu önce (küçük öncelik sayısı önce), sonra dizi sırası; kararlı. */
export function rankByAlerts<T extends { topicId: string | null }>(
  items: readonly T[],
  alertPriority: ReadonlyMap<string, number>,
): T[] {
  const rankOf = (t: T) =>
    t.topicId !== null && alertPriority.has(t.topicId) ? alertPriority.get(t.topicId)! : 99;
  return items
    .map((item, index) => ({ item, index, rank: rankOf(item) }))
    .sort((a, b) => a.rank - b.rank || a.index - b.index)
    .map((x) => x.item);
}

export type SectionPoolRow = {
  sectionId: string;
  resourceTitle: string;
  title: string;
  subjectId: string | null;
  subjectName: string | null;
  topicId: string | null;
  topicName: string | null;
  questionCount: number | null;
};

/** Bitmemiş testler → `section` görevi; hedef test soru sayısı, süre öğrenci temposuyla. */
export function sectionsToPoolItems(
  rows: readonly SectionPoolRow[],
  opts: {
    alertPriority: ReadonlyMap<string, number>;
    pace: Record<string, number>;
    defaults: PlannerDefaults;
  },
): TaskPoolItem[] {
  return rankByAlerts(rows, opts.alertPriority)
    .slice(0, MEDIA_POOL_LIMIT)
    .map((r) => {
      const targetValue = r.questionCount;
      const pace = r.subjectId ? opts.pace[r.subjectId] : undefined;
      const matched = r.topicId !== null && opts.alertPriority.has(r.topicId);
      return {
        key: `resources:${r.sectionId}`,
        categoryId: "resources",
        kind: "section",
        title: taskTitle({
          kind: "section",
          subjectName: r.subjectName,
          topicName: r.topicName,
          targetValue,
          targetUnit: targetValue ? "questions" : null,
          mediaTitle: `${r.resourceTitle} · ${r.title}`,
        }),
        subjectId: r.subjectId,
        topicId: r.topicId,
        targetValue,
        targetUnit: targetValue ? "questions" : null,
        estimatedMinutes: estimateMinutes({
          kind: "section",
          targetValue,
          pace: pace ? { minutesPerQuestion: pace } : null,
          defaults: opts.defaults,
        }),
        sectionId: r.sectionId,
        reason:
          matched && r.topicName ? `Öncelikli konu: ${r.topicName}` : (r.topicName ?? undefined),
      };
    });
}

export type VideoPoolRow = {
  videoId: string;
  playlistTitle: string;
  title: string;
  subjectId: string | null;
  subjectName: string | null;
  topicId: string | null;
  topicName: string | null;
  durationSeconds: number | null;
};

/** Video süresi → plan dakikası: en az 5, süre yoksa `fallback`. */
export function videoMinutes(durationSeconds: number | null, fallback: number): number {
  if (durationSeconds === null || durationSeconds <= 0) return Math.max(5, fallback);
  return Math.max(5, Math.ceil(durationSeconds / 60));
}

/** İzlenmemiş videolar → `video` görevi (dakika hedefi = süre). */
export function videosToPoolItems(
  rows: readonly VideoPoolRow[],
  opts: { alertPriority: ReadonlyMap<string, number>; defaults: PlannerDefaults },
): TaskPoolItem[] {
  return rankByAlerts(rows, opts.alertPriority)
    .slice(0, MEDIA_POOL_LIMIT)
    .map((r) => {
      const minutes = videoMinutes(r.durationSeconds, opts.defaults.link_minutes);
      const matched = r.topicId !== null && opts.alertPriority.has(r.topicId);
      return {
        key: `videos:${r.videoId}`,
        categoryId: "videos",
        kind: "video",
        title: taskTitle({
          kind: "video",
          subjectName: r.subjectName,
          topicName: r.topicName,
          targetValue: minutes,
          targetUnit: "minutes",
          mediaTitle: r.title,
        }),
        subjectId: r.subjectId,
        topicId: r.topicId,
        targetValue: minutes,
        targetUnit: "minutes",
        estimatedMinutes: minutes,
        videoId: r.videoId,
        reason: matched && r.topicName ? `Öncelikli konu: ${r.topicName}` : r.playlistTitle,
      };
    });
}
