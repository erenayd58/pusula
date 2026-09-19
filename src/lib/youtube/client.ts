import { parseIsoDuration } from "./duration";

/**
 * YouTube Data API v3 istemcisi (11 §2 Parça 2). Anahtar ve `fetch` parametre olarak gelir; sunucu
 * sarmalayıcısı (`features/videos/server/youtube.ts`, `server-only`) anahtarı ortamdan verir. Birim
 * testte `fetchImpl` sahte yanıt döner. Kota: her çağrı 1 birim; 200 videoluk liste ≈ 9 birim.
 */

export type YoutubeErrorCode =
  "no_key" | "not_found" | "quota" | "forbidden" | "network" | "invalid";

export class YoutubeError extends Error {
  readonly code: YoutubeErrorCode;
  constructor(code: YoutubeErrorCode, message?: string) {
    super(message ?? code);
    this.name = "YoutubeError";
    this.code = code;
  }
}

export type ImportedVideo = {
  youtubeVideoId: string;
  title: string;
  durationSeconds: number | null;
  sortOrder: number;
};

export type ImportedPlaylist = {
  title: string;
  channelName: string | null;
  videos: ImportedVideo[];
  /** Listede `maxVideos`'tan fazla video vardı; ilk `maxVideos` alındı. */
  truncated: boolean;
};

export const YOUTUBE_MAX_VIDEOS = 200;
const API_BASE = "https://www.googleapis.com/youtube/v3";
const PAGE_SIZE = 50;

type FetchLike = (
  input: string,
) => Promise<{ ok: boolean; status: number; json: () => Promise<unknown> }>;

type ClientOptions = { apiKey: string | null; fetchImpl?: FetchLike; maxVideos?: number };

type PlaylistsResponse = {
  items?: { snippet?: { title?: string; channelTitle?: string } }[];
};
type PlaylistItemsResponse = {
  nextPageToken?: string;
  items?: {
    snippet?: { title?: string; resourceId?: { videoId?: string } };
    status?: { privacyStatus?: string };
  }[];
};
type VideosResponse = {
  items?: { id?: string; snippet?: { title?: string }; contentDetails?: { duration?: string } }[];
};

function errorFromResponse(status: number, body: unknown): YoutubeError {
  const reason =
    typeof body === "object" && body !== null
      ? ((body as { error?: { errors?: { reason?: string }[] } }).error?.errors?.[0]?.reason ?? "")
      : "";
  if (status === 404 || reason === "playlistNotFound" || reason === "videoNotFound") {
    return new YoutubeError("not_found");
  }
  if (
    reason === "quotaExceeded" ||
    reason === "dailyLimitExceeded" ||
    reason === "rateLimitExceeded"
  ) {
    return new YoutubeError("quota");
  }
  if (status === 403 || status === 400) return new YoutubeError("forbidden", reason);
  return new YoutubeError("network", `HTTP ${status}`);
}

async function call<T>(
  path: string,
  params: Record<string, string>,
  opts: ClientOptions,
): Promise<T> {
  if (!opts.apiKey) throw new YoutubeError("no_key");
  const fetchImpl = opts.fetchImpl ?? (globalThis.fetch as FetchLike);
  const query = new URLSearchParams({ ...params, key: opts.apiKey }).toString();
  let response: Awaited<ReturnType<FetchLike>>;
  try {
    response = await fetchImpl(`${API_BASE}/${path}?${query}`);
  } catch {
    throw new YoutubeError("network");
  }
  let body: unknown = null;
  try {
    body = await response.json();
  } catch {
    body = null;
  }
  if (!response.ok) throw errorFromResponse(response.status, body);
  return body as T;
}

/** Süreler `videos.list` ile 50'lik gruplar halinde okunur; dönmeyen (silinmiş/özel) video atlanır. */
async function fetchDurations(
  ids: string[],
  opts: ClientOptions,
): Promise<Map<string, { title: string; durationSeconds: number | null }>> {
  const out = new Map<string, { title: string; durationSeconds: number | null }>();
  for (let i = 0; i < ids.length; i += PAGE_SIZE) {
    const chunk = ids.slice(i, i + PAGE_SIZE);
    const data = await call<VideosResponse>(
      "videos",
      { part: "snippet,contentDetails", id: chunk.join(","), maxResults: String(PAGE_SIZE) },
      opts,
    );
    for (const item of data.items ?? []) {
      if (!item.id) continue;
      out.set(item.id, {
        title: item.snippet?.title ?? "",
        durationSeconds: item.contentDetails?.duration
          ? parseIsoDuration(item.contentDetails.duration)
          : null,
      });
    }
  }
  return out;
}

/** Oynatma listesi: başlık + kanal + videolar (YouTube sırasıyla, en fazla `maxVideos`). */
export async function fetchPlaylist(
  playlistId: string,
  opts: ClientOptions,
): Promise<ImportedPlaylist> {
  const maxVideos = opts.maxVideos ?? YOUTUBE_MAX_VIDEOS;
  const meta = await call<PlaylistsResponse>(
    "playlists",
    { part: "snippet", id: playlistId, maxResults: "1" },
    opts,
  );
  const head = meta.items?.[0];
  if (!head) throw new YoutubeError("not_found");

  const ids: string[] = [];
  let pageToken: string | undefined;
  let truncated = false;
  do {
    const page = await call<PlaylistItemsResponse>(
      "playlistItems",
      {
        part: "snippet,status",
        playlistId,
        maxResults: String(PAGE_SIZE),
        ...(pageToken ? { pageToken } : {}),
      },
      opts,
    );
    for (const item of page.items ?? []) {
      const id = item.snippet?.resourceId?.videoId;
      const privacy = item.status?.privacyStatus;
      // Özel/silinmiş videolar (izlenemez) atlanır; `privacyStatus` yoksa videos.list eler.
      if (!id || privacy === "private" || privacy === "privacyStatusUnspecified") continue;
      if (ids.length >= maxVideos) {
        truncated = true;
        break;
      }
      ids.push(id);
    }
    pageToken = truncated ? undefined : page.nextPageToken;
  } while (pageToken);

  const details = await fetchDurations(ids, opts);
  const videos: ImportedVideo[] = [];
  for (const id of ids) {
    const d = details.get(id);
    if (!d) continue;
    videos.push({
      youtubeVideoId: id,
      title: d.title.trim() || id,
      durationSeconds: d.durationSeconds,
      sortOrder: videos.length,
    });
  }
  return {
    title: head.snippet?.title?.trim() || playlistId,
    channelName: head.snippet?.channelTitle?.trim() || null,
    videos,
    truncated,
  };
}

/** Tek video başlığı ve süresi (elle ekleme). */
export async function fetchVideo(
  videoId: string,
  opts: ClientOptions,
): Promise<{ title: string; durationSeconds: number | null }> {
  const details = await fetchDurations([videoId], opts);
  const d = details.get(videoId);
  if (!d) throw new YoutubeError("not_found");
  return { title: d.title.trim() || videoId, durationSeconds: d.durationSeconds };
}

/** Kullanıcıya gösterilecek Türkçe hata metni (ikon + eylem sayfada). */
export function youtubeErrorMessage(error: unknown): string {
  const code = error instanceof YoutubeError ? error.code : "network";
  switch (code) {
    case "no_key":
      return "YouTube API anahtarı tanımlı değil (YOUTUBE_API_KEY); videoyu elle ekleyebilirsin.";
    case "not_found":
      return "Liste ya da video bulunamadı; bağlantıyı ve listenin herkese açık ya da liste dışı olduğunu kontrol et.";
    case "quota":
      return "YouTube günlük kotası doldu; yarın tekrar dene ya da videoyu elle ekle.";
    case "forbidden":
      return "YouTube isteği reddedildi; API anahtarının YouTube Data API v3 için geçerli olduğunu kontrol et.";
    case "invalid":
      return "Bağlantı bir YouTube listesi ya da videosu değil.";
    default:
      return "YouTube'a ulaşılamadı; tekrar dene.";
  }
}
