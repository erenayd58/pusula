import { describe, expect, it } from "vitest";
import {
  formatCount,
  formatDateTr,
  formatDuration,
  formatNet,
  formatPercent,
  formatSigned,
  formatWeekRange,
  withUnit,
} from "./index";

const MINUS = String.fromCharCode(0x2212);
const DASH = ` ${String.fromCharCode(0x2013)} `;
/** Bölünmeyen boşluk (U+00A0). */
const NB = String.fromCharCode(0x00a0);

describe("formatPercent", () => {
  it("0–100 ölçeğinde yüzde yazar", () => {
    expect(formatPercent(80)).toBe("%80");
    expect(formatPercent(0)).toBe("%0");
    expect(formatPercent(100)).toBe("%100");
  });
  it("basamak sayısını uygular ve virgül kullanır", () => {
    expect(formatPercent(71.333, 1)).toBe("%71,3");
    expect(formatPercent(85.5)).toBe("%86");
  });
});

describe("formatNet", () => {
  it("her zaman iki basamak", () => {
    expect(formatNet(71.333)).toBe("71,33");
    expect(formatNet(30)).toBe("30,00");
    expect(formatNet(0)).toBe("0,00");
  });
  it("negatifte tipografik eksi", () => {
    expect(formatNet(-0.5)).toBe(`${MINUS}0,50`);
    expect(formatNet(-4.333)).toBe(`${MINUS}4,33`);
    expect(formatNet(-4.333)).not.toContain("-");
  });
  it("yuvarlama sonucu sıfırsa işaret yok", () => {
    expect(formatNet(-0.001)).toBe("0,00");
  });
  it("birim bölünmeyen boşlukla eklenir", () => {
    expect(formatNet(71.333, "net")).toBe(`71,33${NB}net`);
    expect(formatNet(71.333, "net")).not.toContain(" ");
  });
});

describe("withUnit", () => {
  it("sayı ile birim arasına U+00A0 koyar", () => {
    expect(withUnit("1.250", "soru")).toBe(`1.250${NB}soru`);
  });
});

describe("formatSigned", () => {
  it("pozitif değişimde artı", () => {
    expect(formatSigned(3.67)).toBe("+3,67");
    expect(formatSigned(12, 0)).toBe("+12");
  });
  it("negatif değişimde tipografik eksi", () => {
    expect(formatSigned(-0.5)).toBe(`${MINUS}0,50`);
    expect(formatSigned(-5, 0)).toBe(`${MINUS}5`);
  });
  it("sıfırda işaret yok", () => {
    expect(formatSigned(0)).toBe("0,00");
    expect(formatSigned(-0.001)).toBe("0,00");
    expect(formatSigned(0.004)).toBe("0,00");
  });
});

describe("formatCount", () => {
  it("binlik ayırıcı nokta", () => {
    expect(formatCount(1250)).toBe("1.250");
    expect(formatCount(12)).toBe("12");
    expect(formatCount(1000000)).toBe("1.000.000");
  });
  it("ondalık yok, yuvarlar", () => {
    expect(formatCount(12.6)).toBe("13");
  });
  it("birim bölünmeyen boşlukla eklenir", () => {
    expect(formatCount(1250, "soru")).toBe(`1.250${NB}soru`);
  });
});

describe("formatDuration", () => {
  it("saat ve dakika; tüm boşluklar bölünmez", () => {
    expect(formatDuration(860)).toBe(`14${NB}sa${NB}20${NB}dk`);
    expect(formatDuration(45)).toBe(`45${NB}dk`);
    expect(formatDuration(120)).toBe(`2${NB}sa`);
    expect(formatDuration(0)).toBe(`0${NB}dk`);
    expect(formatDuration(860)).not.toContain(" ");
  });
  it("negatif ve kesirli girdiler", () => {
    expect(formatDuration(-10)).toBe(`0${NB}dk`);
    expect(formatDuration(59.6)).toBe(`1${NB}sa`);
  });
});

describe("formatDateTr", () => {
  it("İstanbul saat diliminde Türkçe ay adı; gün–ay arası bölünmez", () => {
    // 2026-09-15 21:30 UTC = 16 Eylül 00:30 İstanbul
    expect(formatDateTr(new Date("2026-09-15T21:30:00Z"))).toBe(`16${NB}Eylül`);
    expect(formatDateTr(new Date("2026-09-15T21:30:00Z"), { year: true })).toBe(
      `16${NB}Eylül${NB}2026`,
    );
  });
});

describe("formatWeekRange", () => {
  it("aynı ay", () => {
    expect(formatWeekRange(new Date("2026-09-14T00:00:00+03:00"))).toBe(`14${DASH}20${NB}Eylül`);
  });
  it("ay değişiyor", () => {
    expect(formatWeekRange(new Date("2026-09-28T00:00:00+03:00"))).toBe(
      `28${NB}Eylül${DASH}4${NB}Ekim`,
    );
  });
  it("yıl değişiyor: iki tarafta da yıl", () => {
    expect(formatWeekRange(new Date("2026-12-28T00:00:00+03:00"))).toBe(
      `28${NB}Aralık${NB}2026${DASH}3${NB}Ocak${NB}2027`,
    );
  });
  it("yıl istenirse sonda yıl", () => {
    expect(formatWeekRange(new Date("2026-09-21T00:00:00+03:00"), { year: true })).toBe(
      `21${DASH}27${NB}Eylül${NB}2026`,
    );
    expect(formatWeekRange(new Date("2026-09-28T00:00:00+03:00"), { year: true })).toBe(
      `28${NB}Eylül${DASH}4${NB}Ekim${NB}2026`,
    );
  });
  it("satır yalnızca dash çevresinde kırılabilir", () => {
    const text = formatWeekRange(new Date("2026-09-28T00:00:00+03:00"));
    expect(text.split(" ")).toHaveLength(3); // "28 Eylül", "–", "4 Ekim" (NBSP hariç)
  });
});
