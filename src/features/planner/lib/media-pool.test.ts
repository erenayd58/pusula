import { describe, expect, it } from "vitest";
import { NBSP } from "@/lib/format";
import type { PlannerDefaults } from "./estimate";
import {
  alertPriorityByTopic,
  rankByAlerts,
  sectionsToPoolItems,
  videoMinutes,
  videosToPoolItems,
  type SectionPoolRow,
  type VideoPoolRow,
} from "./media-pool";

const DEFAULTS: PlannerDefaults = {
  minutes_per_question: 1.5,
  topic_study_minutes: 40,
  review_minutes: 20,
  link_minutes: 15,
  custom_minutes: 30,
  questions_target: 20,
};

const section = (over: Partial<SectionPoolRow>): SectionPoolRow => ({
  sectionId: "s1",
  resourceTitle: "Tonguç Mat SB",
  title: "Test 1",
  subjectId: "mat",
  subjectName: "Matematik",
  topicId: null,
  topicName: null,
  questionCount: 20,
  ...over,
});

describe("rankByAlerts / alertPriorityByTopic", () => {
  it("eşleşen konu önce, küçük öncelik önce, gerisi dizi sırasıyla (kararlı)", () => {
    const priority = new Map([
      ["t-weak", 0],
      ["t-review", 6],
    ]);
    const items = [
      { id: "a", topicId: null },
      { id: "b", topicId: "t-review" },
      { id: "c", topicId: "t-weak" },
      { id: "d", topicId: "t-other" },
      { id: "e", topicId: "t-weak" },
    ];
    expect(rankByAlerts(items, priority).map((i) => i.id)).toEqual(["c", "e", "b", "a", "d"]);
  });

  it("aynı konuda birden fazla uyarı varsa en küçük sıra kalır; ders düzeyi uyarı girmez", () => {
    const alert = (
      kind: "knowledge_gap" | "review_due" | "neglected_subject",
      topicId: string | null,
    ) => ({ kind, topicId }) as Parameters<typeof alertPriorityByTopic>[0][number];
    const map = alertPriorityByTopic([
      alert("review_due", "t1"),
      alert("knowledge_gap", "t1"),
      alert("neglected_subject", null),
    ]);
    expect(map.get("t1")).toBe(0);
    expect(map.size).toBe(1);
  });
});

describe("sectionsToPoolItems", () => {
  it("bitmemiş test → section görevi; başlık, hedef ve tempo süresi; öncelikli konu sebebi", () => {
    const rows = [
      section({ sectionId: "s1", title: "Test 1" }),
      section({ sectionId: "s2", title: "Test 2", topicId: "t1", topicName: "Üslü İfadeler" }),
    ];
    const items = sectionsToPoolItems(rows, {
      alertPriority: new Map([["t1", 0]]),
      pace: { mat: 2 },
      defaults: DEFAULTS,
    });
    expect(items.map((i) => i.key)).toEqual(["resources:s2", "resources:s1"]);
    const first = items[0]!;
    expect(first.kind).toBe("section");
    expect(first.sectionId).toBe("s2");
    expect(first.title).toBe(`Tonguç Mat SB · Test 2 · 20${NBSP}soru`);
    expect(first.targetValue).toBe(20);
    expect(first.targetUnit).toBe("questions");
    expect(first.estimatedMinutes).toBe(40);
    expect(first.reason).toBe("Öncelikli konu: Üslü İfadeler");
    expect(items[1]!.reason).toBeUndefined();
  });

  it("soru sayısı yoksa hedef boş, süre kurum hedefiyle", () => {
    const [item] = sectionsToPoolItems([section({ questionCount: null })], {
      alertPriority: new Map(),
      pace: {},
      defaults: DEFAULTS,
    });
    expect(item!.targetValue).toBeNull();
    expect(item!.estimatedMinutes).toBe(30);
  });

  it("en fazla 40 öğe", () => {
    const rows = Array.from({ length: 60 }, (_, i) => section({ sectionId: `s${i}` }));
    expect(
      sectionsToPoolItems(rows, { alertPriority: new Map(), pace: {}, defaults: DEFAULTS }),
    ).toHaveLength(40);
  });
});

describe("videosToPoolItems / videoMinutes", () => {
  const video = (over: Partial<VideoPoolRow>): VideoPoolRow => ({
    videoId: "v1",
    playlistTitle: "Mat Dersleri",
    title: "Üslü İfadeler 1",
    subjectId: "mat",
    subjectName: "Matematik",
    topicId: "t1",
    topicName: "Üslü İfadeler",
    durationSeconds: 754,
    ...over,
  });

  it("süre dakikaya yukarı yuvarlanır, en az 5; süre yoksa bağlantı varsayılanı", () => {
    expect(videoMinutes(754, 15)).toBe(13);
    expect(videoMinutes(90, 15)).toBe(5);
    expect(videoMinutes(null, 15)).toBe(15);
    expect(videoMinutes(0, 3)).toBe(5);
  });

  it("izlenmemiş video → video görevi; dakika hedefi; başlık 'Video: …'", () => {
    const [item] = videosToPoolItems([video({})], {
      alertPriority: new Map([["t1", 2]]),
      defaults: DEFAULTS,
    });
    expect(item!.kind).toBe("video");
    expect(item!.videoId).toBe("v1");
    expect(item!.title).toBe("Video: Üslü İfadeler 1");
    expect(item!.targetValue).toBe(13);
    expect(item!.targetUnit).toBe("minutes");
    expect(item!.estimatedMinutes).toBe(13);
    expect(item!.reason).toBe("Öncelikli konu: Üslü İfadeler");
  });

  it("eşleşmeyen videoda sebep liste adı", () => {
    const [item] = videosToPoolItems([video({ topicId: null, topicName: null })], {
      alertPriority: new Map(),
      defaults: DEFAULTS,
    });
    expect(item!.reason).toBe("Mat Dersleri");
  });
});
