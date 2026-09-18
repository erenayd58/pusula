import { describe, expect, it } from "vitest";
import { distributeEvenly, schoolLagWeeks } from "./school-calendar";

describe("distributeEvenly", () => {
  it("hafta sayısı kadar konu: her haftanın pazartesisi sırayla", () => {
    // 14 Eyl – 4 Eki 2026: 3 hafta.
    expect(distributeEvenly({ count: 3, from: "2026-09-14", to: "2026-10-04" })).toEqual([
      "2026-09-14",
      "2026-09-21",
      "2026-09-28",
    ]);
  });

  it("eşit yayılım: her konu kendi diliminin son haftasında biter", () => {
    // 10 hafta (14 Eyl – 22 Kas), 2 konu → 5. ve 10. hafta.
    expect(distributeEvenly({ count: 2, from: "2026-09-14", to: "2026-11-22" })).toEqual([
      "2026-10-12",
      "2026-11-16",
    ]);
    // 10 hafta, 3 konu → paylar 3,33 hafta: 4., 7., 10. hafta.
    expect(distributeEvenly({ count: 3, from: "2026-09-14", to: "2026-11-22" })).toEqual([
      "2026-10-05",
      "2026-10-26",
      "2026-11-16",
    ]);
    // Tek konu aralığın son haftasına.
    expect(distributeEvenly({ count: 1, from: "2026-09-14", to: "2026-11-22" })).toEqual([
      "2026-11-16",
    ]);
  });

  it("pazartesi olmayan sınırlar haftalarına yuvarlanır (başlangıç haftası dahil)", () => {
    // Çarşamba 16 Eyl → hafta 14 Eyl; cuma 25 Eyl → hafta 21 Eyl.
    expect(distributeEvenly({ count: 2, from: "2026-09-16", to: "2026-09-25" })).toEqual([
      "2026-09-14",
      "2026-09-21",
    ]);
  });

  it("ara tatil haftaları atlanır", () => {
    // 14 Eyl – 11 Eki: haftalar 14 Eyl, 21 Eyl, 28 Eyl, 5 Eki; 23–25 Eyl tatil → 21 Eyl haftası düşer.
    expect(
      distributeEvenly({
        count: 3,
        from: "2026-09-14",
        to: "2026-10-11",
        skip: { from: "2026-09-23", to: "2026-09-25" },
      }),
    ).toEqual(["2026-09-14", "2026-09-28", "2026-10-05"]);
  });

  it("konu sayısı uygun hafta sayısını aşarsa pazartesiler tekrar eder", () => {
    // 2 hafta, 5 konu → paylar 0,4 hafta: 1, 1, 2, 2, 2. hafta.
    expect(distributeEvenly({ count: 5, from: "2026-09-14", to: "2026-09-27" })).toEqual([
      "2026-09-14",
      "2026-09-14",
      "2026-09-21",
      "2026-09-21",
      "2026-09-21",
    ]);
  });

  it("uçlar: sıfır konu, ters aralık ya da tümü tatil → boş dizi", () => {
    expect(distributeEvenly({ count: 0, from: "2026-09-14", to: "2026-10-04" })).toEqual([]);
    expect(distributeEvenly({ count: 3, from: "2026-10-04", to: "2026-09-14" })).toEqual([]);
    expect(
      distributeEvenly({
        count: 2,
        from: "2026-09-14",
        to: "2026-09-27",
        skip: { from: "2026-09-14", to: "2026-09-27" },
      }),
    ).toEqual([]);
  });

  it("ters tatil aralığı yok sayılır", () => {
    expect(
      distributeEvenly({
        count: 2,
        from: "2026-09-14",
        to: "2026-09-27",
        skip: { from: "2026-09-27", to: "2026-09-14" },
      }),
    ).toEqual(["2026-09-14", "2026-09-21"]);
  });
});

describe("schoolLagWeeks", () => {
  it("hafta çözünürlüğü: aynı hafta 0, geçen hafta 1, gelecek negatif", () => {
    // Bugün cuma 18 Eyl 2026 (hafta 14 Eyl).
    expect(schoolLagWeeks("2026-09-14", "2026-09-18")).toBe(0);
    expect(schoolLagWeeks("2026-09-20", "2026-09-18")).toBe(0); // pazar, aynı hafta
    expect(schoolLagWeeks("2026-09-11", "2026-09-18")).toBe(1); // geçen haftanın cuması
    expect(schoolLagWeeks("2026-08-24", "2026-09-18")).toBe(3);
    expect(schoolLagWeeks("2026-09-21", "2026-09-18")).toBe(-1);
    expect(schoolLagWeeks("2026-10-12", "2026-09-18")).toBe(-4);
  });
});
