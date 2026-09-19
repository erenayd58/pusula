import "server-only";

import { serverEnv } from "@/lib/env";
import {
  fetchPlaylist as fetchPlaylistWithKey,
  fetchVideo as fetchVideoWithKey,
  type ImportedPlaylist,
} from "@/lib/youtube/client";

/**
 * YouTube Data API v3 sarmalayıcısı (11 §2 Parça 2): anahtar yalnızca sunucuda (`YOUTUBE_API_KEY`),
 * istemciye hiç gitmez. İstemci mantığı ve hata eşlemesi `lib/youtube/client` (birim testli).
 */

export function hasYoutubeApiKey(): boolean {
  return serverEnv.youtubeApiKey !== null;
}

export function fetchPlaylist(playlistId: string): Promise<ImportedPlaylist> {
  return fetchPlaylistWithKey(playlistId, { apiKey: serverEnv.youtubeApiKey });
}

export function fetchVideo(
  videoId: string,
): Promise<{ title: string; durationSeconds: number | null }> {
  return fetchVideoWithKey(videoId, { apiKey: serverEnv.youtubeApiKey });
}
