import { describe, expect, it } from "vitest";
import { normalizeTitle, similarTitles } from "./similar";

const catalog = [
  { id: "1", title: "Tonguç Matematik Soru Bankası" },
  { id: "2", title: "Hız Yayınları Fen Bilimleri Fasikül" },
  { id: "3", title: "Matematik Yaprak Test" },
  { id: "4", title: "İngilizce Kelime Defteri" },
];

describe("normalizeTitle", () => {
  it("Türkçe küçük harf, noktalama ve dolgu sözcükler", () => {
    expect(normalizeTitle("TONGUÇ  Matematik - Soru Bankası!")).toBe(
      "tonguç matematik soru bankası",
    );
    expect(normalizeTitle("Hız Yayınları Fen")).toBe("hız fen");
    expect(normalizeTitle("İNGİLİZCE Işık Yay.")).toBe("ingilizce ışık");
  });
});

describe("similarTitles", () => {
  it("yazılmakta olan sözcük önek eşleşir, ad sorguyla başlayınca öne çıkar", () => {
    expect(similarTitles("Tong", catalog).map((c) => c.id)).toEqual(["1"]);
    expect(similarTitles("tonguç mat", catalog).map((c) => c.id)).toEqual(["1"]);
  });

  it("ortak sözcükler benzerlik verir; en fazla limit kadar, puana göre sıralı", () => {
    expect(similarTitles("Matematik Soru Bankası", catalog).map((c) => c.id)).toEqual(["1"]);
    // Tek ortak sözcük (matematik) eşiğin altında kalır; eşik düşürülünce ikinci aday gelir.
    expect(
      similarTitles("Matematik Soru Bankası", catalog, { minScore: 0.2 }).map((c) => c.id),
    ).toEqual(["1", "3"]);
    expect(
      similarTitles("Matematik Soru Bankası", catalog, { minScore: 0.2, limit: 1 }),
    ).toHaveLength(1);
  });

  it("dolgu sözcük ve büyük/küçük harf farkı engel değil", () => {
    expect(similarTitles("hız fen bilimleri fasikül", catalog).map((c) => c.id)).toEqual(["2"]);
  });

  it("kısa sorgu ve ilgisiz sorgu boş döner", () => {
    expect(similarTitles("To", catalog)).toEqual([]);
    expect(similarTitles("Tarih Deneme", catalog)).toEqual([]);
  });
});
