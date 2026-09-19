import { describe, expect, it } from "vitest";
import { YoutubeError, fetchPlaylist, fetchVideo, youtubeErrorMessage } from "./client";

type Reply = { ok: boolean; status: number; body: unknown };

/** Sahte YouTube: yol + sorguya göre yanıt; çağrılar kaydedilir. */
function fakeFetch(routes: (url: URL) => Reply) {
  const calls: URL[] = [];
  const fetchImpl = async (input: string) => {
    const url = new URL(input);
    calls.push(url);
    const reply = routes(url);
    return { ok: reply.ok, status: reply.status, json: async () => reply.body };
  };
  return { fetchImpl, calls };
}

const playlistMeta = {
  items: [{ snippet: { title: "Mat Dersleri", channelTitle: "Demo Kanal" } }],
};

function itemsPage(ids: string[], nextPageToken?: string, privacy: Record<string, string> = {}) {
  return {
    nextPageToken,
    items: ids.map((id) => ({
      snippet: { title: `başlık ${id}`, resourceId: { videoId: id } },
      status: { privacyStatus: privacy[id] ?? "public" },
    })),
  };
}

function videosPage(ids: string[], durations: Record<string, string>, skip: string[] = []) {
  return {
    items: ids
      .filter((id) => !skip.includes(id))
      .map((id) => ({
        id,
        snippet: { title: `Video ${id}` },
        contentDetails: { duration: durations[id] ?? "PT10M" },
      })),
  };
}

const ids = (n: number, prefix = "v") =>
  Array.from({ length: n }, (_, i) => `${prefix}${String(i).padStart(10, "0")}`.slice(0, 11));

describe("fetchPlaylist", () => {
  it("iki sayfa liste + süreler; özel video atlanır, videos.list'te dönmeyen elenir; sıra korunur", async () => {
    const page1 = ids(50, "a");
    const page2 = ["b0000000001", "b0000000002", "b0000000003"];
    const { fetchImpl, calls } = fakeFetch((url) => {
      if (url.pathname.endsWith("/playlists")) return { ok: true, status: 200, body: playlistMeta };
      if (url.pathname.endsWith("/playlistItems")) {
        return url.searchParams.get("pageToken")
          ? { ok: true, status: 200, body: itemsPage(page2, undefined, { b0000000002: "private" }) }
          : { ok: true, status: 200, body: itemsPage(page1, "TOKEN2") };
      }
      const requested = (url.searchParams.get("id") ?? "").split(",");
      return {
        ok: true,
        status: 200,
        body: videosPage(requested, { b0000000001: "PT1H2M3S" }, ["b0000000003"]),
      };
    });
    const result = await fetchPlaylist("PLtest", { apiKey: "k", fetchImpl });
    expect(result.title).toBe("Mat Dersleri");
    expect(result.channelName).toBe("Demo Kanal");
    expect(result.truncated).toBe(false);
    // 50 + (b1; b2 özel, b3 dönmedi) = 51
    expect(result.videos).toHaveLength(51);
    expect(result.videos[0]).toEqual({
      youtubeVideoId: page1[0],
      title: `Video ${page1[0]}`,
      durationSeconds: 600,
      sortOrder: 0,
    });
    expect(result.videos[50]).toEqual({
      youtubeVideoId: "b0000000001",
      title: "Video b0000000001",
      durationSeconds: 3723,
      sortOrder: 50,
    });
    // 1 playlists + 2 playlistItems + 2 videos (50 + 1 kimlik → iki grup)
    expect(calls.map((c) => c.pathname.split("/").pop())).toEqual([
      "playlists",
      "playlistItems",
      "playlistItems",
      "videos",
      "videos",
    ]);
    expect(calls.every((c) => c.searchParams.get("key") === "k")).toBe(true);
  });

  it("maxVideos aşılınca ilk N alınır ve truncated", async () => {
    const { fetchImpl } = fakeFetch((url) => {
      if (url.pathname.endsWith("/playlists")) return { ok: true, status: 200, body: playlistMeta };
      if (url.pathname.endsWith("/playlistItems")) {
        return { ok: true, status: 200, body: itemsPage(ids(50, "c"), "MORE") };
      }
      const requested = (url.searchParams.get("id") ?? "").split(",");
      return { ok: true, status: 200, body: videosPage(requested, {}) };
    });
    const result = await fetchPlaylist("PLtest", { apiKey: "k", fetchImpl, maxVideos: 30 });
    expect(result.videos).toHaveLength(30);
    expect(result.truncated).toBe(true);
  });

  it("anahtar yoksa no_key; 404 → not_found; kota → quota; ağ hatası → network", async () => {
    await expect(fetchPlaylist("PLtest", { apiKey: null })).rejects.toMatchObject({
      code: "no_key",
    });
    const notFound = fakeFetch(() => ({
      ok: false,
      status: 404,
      body: { error: { errors: [{ reason: "playlistNotFound" }] } },
    }));
    await expect(
      fetchPlaylist("PLtest", { apiKey: "k", fetchImpl: notFound.fetchImpl }),
    ).rejects.toMatchObject({ code: "not_found" });
    const quota = fakeFetch(() => ({
      ok: false,
      status: 403,
      body: { error: { errors: [{ reason: "quotaExceeded" }] } },
    }));
    await expect(
      fetchPlaylist("PLtest", { apiKey: "k", fetchImpl: quota.fetchImpl }),
    ).rejects.toMatchObject({ code: "quota" });
    const network = {
      fetchImpl: async () => {
        throw new Error("offline");
      },
    };
    await expect(
      fetchPlaylist("PLtest", { apiKey: "k", fetchImpl: network.fetchImpl }),
    ).rejects.toMatchObject({ code: "network" });
    // Boş liste yanıtı da not_found.
    const empty = fakeFetch(() => ({ ok: true, status: 200, body: { items: [] } }));
    await expect(
      fetchPlaylist("PLtest", { apiKey: "k", fetchImpl: empty.fetchImpl }),
    ).rejects.toMatchObject({ code: "not_found" });
  });
});

describe("fetchVideo / youtubeErrorMessage", () => {
  it("tek video başlık + süre; bulunamazsa not_found", async () => {
    const { fetchImpl } = fakeFetch((url) => ({
      ok: true,
      status: 200,
      body: videosPage((url.searchParams.get("id") ?? "").split(","), { dQw4w9WgXcQ: "PT3M33S" }),
    }));
    expect(await fetchVideo("dQw4w9WgXcQ", { apiKey: "k", fetchImpl })).toEqual({
      title: "Video dQw4w9WgXcQ",
      durationSeconds: 213,
    });
    const empty = fakeFetch(() => ({ ok: true, status: 200, body: { items: [] } }));
    await expect(
      fetchVideo("dQw4w9WgXcQ", { apiKey: "k", fetchImpl: empty.fetchImpl }),
    ).rejects.toMatchObject({ code: "not_found" });
  });

  it("Türkçe mesajlar", () => {
    expect(youtubeErrorMessage(new YoutubeError("no_key"))).toMatch(/YOUTUBE_API_KEY/);
    expect(youtubeErrorMessage(new YoutubeError("quota"))).toMatch(/kotası doldu/);
    expect(youtubeErrorMessage(new YoutubeError("not_found"))).toMatch(/bulunamadı/);
    expect(youtubeErrorMessage(new Error("x"))).toMatch(/ulaşılamadı/);
  });
});
