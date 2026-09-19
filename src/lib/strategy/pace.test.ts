import { describe, expect, it } from "vitest";
import { NBSP } from "@/lib/format";
import { paceLabel, paceSentence, subjectPace, topicPace, type PaceTopic } from "./pace";

const TODAY = "2026-09-18";
const MINUS = String.fromCharCode(0x2212);
const ago = (n: number) => {
  const d = new Date(`${TODAY}T12:00:00+03:00`);
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString();
};
const t = (id: string, over: Partial<PaceTopic> = {}): PaceTopic => ({
  topicId: id,
  subjectId: "mat",
  done: false,
  completedAt: null,
  targetOn: null,
  ...over,
});
const input = { today: TODAY, examOn: "2027-06-13", windowDays: 28 };

describe("topicPace", () => {
  it("geride: beklenen = hedefi bugün ya da öncesi olanlar; net = bitmiş − beklenen", () => {
    const p = topicPace(
      [
        t("a", { done: true, completedAt: ago(3), targetOn: "2026-09-10" }),
        t("b", { targetOn: "2026-09-15" }),
        t("c", { targetOn: "2026-09-18" }), // bugün → beklenen (hedefi bugün ya da öncesi)
        t("d", { targetOn: "2026-10-01" }),
        t("e", { targetOn: "2026-09-16" }),
      ],
      input,
    );
    expect(p).toMatchObject({ total: 5, done: 1, expectedByToday: 4, overdue: 3, ahead: 0 });
    expect(paceSentence(p, true)).toBe(
      `5${NBSP}konunun 1'i bitti · takvimin 3${NBSP}konu gerisindesin`,
    );
    expect(paceLabel(p, true)).toBe(`${MINUS}3${NBSP}konu`);
  });

  it("hedefsiz bitmiş konular (ör. hedef kurulduktan sonra şablona eklenen) takvimin önündedir: beklenene girmez, ileriye sayılır", () => {
    // 9 bitmiş (hedefsiz), 4 hedefi geçmiş bitmemiş konu → net +5 (çelişkili "9 bitti, 4 geride" yok).
    // Yeniden üretim bitmişlere completedAt günü hedef verdiği için olağan durumda bitmişler beklenene girer.
    const p = topicPace(
      [
        ...Array.from({ length: 9 }, (_, i) => t(`d${i}`, { done: true, completedAt: ago(50) })),
        ...Array.from({ length: 4 }, (_, i) => t(`o${i}`, { targetOn: "2026-09-10" })),
        t("f", { targetOn: "2026-10-05" }),
      ],
      input,
    );
    expect(p).toMatchObject({ total: 14, done: 9, expectedByToday: 4, overdue: 0, ahead: 5 });
    expect(paceSentence(p, true)).toBe(
      `14${NBSP}konunun 9'u bitti · takvimin 5${NBSP}konu ilerisindesin`,
    );
  });

  it("ileride: bitmiş ve hedefi gelecekte; uyumlu: ikisi de 0", () => {
    const ahead = topicPace(
      [
        t("a", { done: true, completedAt: ago(1), targetOn: "2026-10-05" }),
        t("b", { targetOn: "2026-10-12" }),
      ],
      input,
    );
    expect(ahead).toMatchObject({ overdue: 0, ahead: 1, expectedByToday: 0 });
    expect(paceSentence(ahead, true)).toBe(
      `2${NBSP}konunun 1'i bitti · takvimin 1${NBSP}konu ilerisindesin`,
    );
    expect(paceLabel(ahead, true)).toBe(`+1${NBSP}konu`);

    const ok = topicPace([t("a", { targetOn: "2026-10-05" })], input);
    expect(paceSentence(ok, true)).toBe(`1${NBSP}konunun 0'ı bitti · takvimle uyumlusun`);
    expect(paceLabel(ok, true)).toBe("Uyumlu");
  });

  it("veli cümlesi (Faz 8): üçüncü tekil, ad ile; hedefsizken yalnızca sayım", () => {
    const behind = topicPace(
      [t("a", { targetOn: "2026-09-10" }), t("b", { targetOn: "2026-10-05" })],
      input,
    );
    expect(paceSentence(behind, true, { audience: "parent", name: "Ayşe" })).toBe(
      `2${NBSP}konunun 0'ı bitti · Ayşe takvimin 1${NBSP}konu gerisinde`,
    );
    const ahead = topicPace(
      [t("a", { done: true, completedAt: ago(1), targetOn: "2026-10-05" })],
      input,
    );
    expect(paceSentence(ahead, true, { audience: "parent", name: "Ayşe" })).toBe(
      `1${NBSP}konunun 1'i bitti · Ayşe takvimin 1${NBSP}konu ilerisinde`,
    );
    const ok = topicPace([t("a", { targetOn: "2026-10-05" })], input);
    expect(paceSentence(ok, true, { audience: "parent", name: "Ayşe" })).toBe(
      `1${NBSP}konunun 0'ı bitti · Ayşe takvimle uyumlu`,
    );
    expect(paceSentence(ok, true, { audience: "parent" })).toBe(
      `1${NBSP}konunun 0'ı bitti · takvimle uyumlu`,
    );
    expect(paceSentence(ok, false, { audience: "parent", name: "Ayşe" })).toBe(
      `1${NBSP}konunun 0'ı bitti`,
    );
  });

  it("hedefsiz: cümle yalnızca sayım, etiket —", () => {
    const p = topicPace([t("a", { done: true, completedAt: ago(2) }), t("b")], input);
    expect(paceSentence(p, false)).toBe(`2${NBSP}konunun 1'i bitti`);
    expect(paceLabel(p, false)).toBe("—");
  });

  it("hız: son 28 günde bitenler × 7 / 28; pencere sınırı dahil değil; projeksiyon ve açık", () => {
    const topics = [
      t("a", { done: true, completedAt: ago(0) }),
      t("b", { done: true, completedAt: ago(27) }),
      t("c", { done: true, completedAt: ago(28) }), // pencere dışı
      ...Array.from({ length: 5 }, (_, i) => t(`r${i}`)),
    ];
    // Sınav 30 gün sonra: 2 × 7 / 28 = 0,5 konu/hafta → 30/7 hafta × 0,5 = 2,14 → 2 konu.
    const p = topicPace(topics, { today: TODAY, examOn: "2026-10-18", windowDays: 28 });
    expect(p.velocityPerWeek).toBe(0.5);
    expect(p.projectedDoneByExam).toBe(5);
    expect(p.shortfall).toBe(3);
    // Kalan 5 / (0,5/7) = 70 gün → 27 Kas 2026.
    expect(p.projectedFinishOn).toBe("2026-11-27");
  });

  it("hız 0: projeksiyon null, açık = kalan; sınav tarihi yok: shortfall 0, projeksiyon bitenler", () => {
    const zero = topicPace([t("a"), t("b", { done: true, completedAt: ago(60) })], input);
    expect(zero.velocityPerWeek).toBe(0);
    expect(zero.projectedFinishOn).toBeNull();
    expect(zero.shortfall).toBe(1);
    const noExam = topicPace([t("a"), t("b", { done: true, completedAt: ago(2) })], {
      ...input,
      examOn: null,
    });
    expect(noExam.shortfall).toBe(0);
    expect(noExam.projectedDoneByExam).toBe(1);
    expect(noExam.projectedFinishOn).not.toBeNull();
    const allDone = topicPace([t("a", { done: true, completedAt: ago(90) })], input);
    expect(allDone.projectedFinishOn).toBe(TODAY);
  });

  it("subjectPace ders alt kümesiyle aynı hesabı yapar", () => {
    const topics = [
      t("a", { subjectId: "tr", targetOn: "2026-09-01" }),
      t("b", { subjectId: "mat", targetOn: "2026-09-01" }),
      t("c", { subjectId: "mat", done: true, completedAt: ago(1), targetOn: "2026-12-01" }),
    ];
    expect(subjectPace(topics, "mat", input)).toMatchObject({
      total: 2,
      done: 1,
      expectedByToday: 1,
      overdue: 0,
      ahead: 0,
    });
    expect(subjectPace(topics, "tr", input)).toMatchObject({ total: 1, done: 0, overdue: 1 });
    expect(subjectPace(topics, "fen", input)).toMatchObject({ total: 0, done: 0 });
  });
});
