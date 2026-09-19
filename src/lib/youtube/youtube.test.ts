import { describe, expect, it } from "vitest";
import { parseIsoDuration } from "./duration";
import { playlistProgress } from "./progress";
import { parseYoutubeUrl } from "./url";

describe("parseYoutubeUrl", () => {
  it("oynatma listesi bağlantıları", () => {
    expect(parseYoutubeUrl("https://www.youtube.com/playlist?list=PLabc123DEF456ghi")).toEqual({
      kind: "playlist",
      id: "PLabc123DEF456ghi",
    });
    expect(parseYoutubeUrl("youtube.com/playlist?list=PLabc123DEF456ghi")).toEqual({
      kind: "playlist",
      id: "PLabc123DEF456ghi",
    });
    expect(parseYoutubeUrl("PLabc123DEF456ghi")).toEqual({
      kind: "playlist",
      id: "PLabc123DEF456ghi",
    });
  });

  it("video bağlantıları (watch, youtu.be, shorts, embed, çıplak kimlik); listedeki video listId taşır", () => {
    expect(parseYoutubeUrl("https://www.youtube.com/watch?v=dQw4w9WgXcQ")).toEqual({
      kind: "video",
      id: "dQw4w9WgXcQ",
    });
    expect(parseYoutubeUrl("https://youtu.be/dQw4w9WgXcQ?t=10")).toEqual({
      kind: "video",
      id: "dQw4w9WgXcQ",
    });
    expect(parseYoutubeUrl("https://m.youtube.com/shorts/dQw4w9WgXcQ")).toEqual({
      kind: "video",
      id: "dQw4w9WgXcQ",
    });
    expect(parseYoutubeUrl("https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ")).toEqual({
      kind: "video",
      id: "dQw4w9WgXcQ",
    });
    expect(parseYoutubeUrl("dQw4w9WgXcQ")).toEqual({ kind: "video", id: "dQw4w9WgXcQ" });
    expect(
      parseYoutubeUrl("https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=PLabc123DEF456ghi"),
    ).toEqual({ kind: "video", id: "dQw4w9WgXcQ", listId: "PLabc123DEF456ghi" });
  });

  it("geçersiz girdi → null", () => {
    expect(parseYoutubeUrl("")).toBeNull();
    expect(parseYoutubeUrl("https://vimeo.com/123")).toBeNull();
    expect(parseYoutubeUrl("https://www.youtube.com/watch?v=kisa")).toBeNull();
    expect(parseYoutubeUrl("https://www.youtube.com/playlist")).toBeNull();
    expect(parseYoutubeUrl("bir metin")).toBeNull();
  });
});

describe("parseIsoDuration", () => {
  it("saat/dakika/saniye → saniye; canlı yayın 0; geçersiz null", () => {
    expect(parseIsoDuration("PT1H2M3S")).toBe(3723);
    expect(parseIsoDuration("PT12M34S")).toBe(754);
    expect(parseIsoDuration("PT45S")).toBe(45);
    expect(parseIsoDuration("P1DT1H")).toBe(90000);
    expect(parseIsoDuration("P0D")).toBe(0);
    expect(parseIsoDuration("12:34")).toBeNull();
    expect(parseIsoDuration("P")).toBeNull();
  });
});

describe("playlistProgress", () => {
  const videos = [
    { id: "a", durationSeconds: 600 },
    { id: "b", durationSeconds: 754 },
    { id: "c", durationSeconds: null },
  ];
  it("izlenen / toplam, kalan dakika izlenmemişlerden", () => {
    expect(playlistProgress(videos, new Set(["a"]))).toEqual({
      total: 3,
      watched: 1,
      percent: 33,
      remainingMinutes: 13,
    });
  });
  it("video yoksa yüzde null", () => {
    expect(playlistProgress([], new Set())).toEqual({
      total: 0,
      watched: 0,
      percent: null,
      remainingMinutes: 0,
    });
  });
});
