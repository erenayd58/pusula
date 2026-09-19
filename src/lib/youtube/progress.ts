/** Liste ilerlemesi (11 §3.1): izlenen / toplam; kalan dakika = izlenmemişlerin süresi. Saf. */
export function playlistProgress(
  videos: readonly { id: string; durationSeconds: number | null }[],
  watchedIds: ReadonlySet<string>,
): { total: number; watched: number; percent: number | null; remainingMinutes: number } {
  const total = videos.length;
  let watched = 0;
  let remainingSeconds = 0;
  for (const v of videos) {
    if (watchedIds.has(v.id)) watched += 1;
    else remainingSeconds += v.durationSeconds ?? 0;
  }
  return {
    total,
    watched,
    percent: total === 0 ? null : Math.round((watched / total) * 100),
    remainingMinutes: Math.round(remainingSeconds / 60),
  };
}
