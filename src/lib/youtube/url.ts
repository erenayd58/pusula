/**
 * YouTube bağlantısı ayrıştırma (11 §3.1). Saf; ağ yok.
 * Kabul edilen biçimler: youtube.com/playlist?list=…, youtube.com/watch?v=…(&list=…),
 * youtu.be/ID, youtube.com/shorts/ID, youtube.com/embed/ID, çıplak 11 karakterlik video kimliği,
 * çıplak liste kimliği (PL…/UU…/OL… gibi, 10–60 karakter).
 */

const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;
const LIST_ID = /^[A-Za-z0-9_-]{10,60}$/;

export type ParsedYoutubeUrl =
  { kind: "playlist"; id: string } | { kind: "video"; id: string; listId?: string };

export function parseYoutubeUrl(input: string): ParsedYoutubeUrl | null {
  const raw = input.trim();
  if (raw === "") return null;
  if (VIDEO_ID.test(raw)) return { kind: "video", id: raw };
  if (/^(PL|UU|OL|RD|LL|FL)[A-Za-z0-9_-]{8,}$/.test(raw) && LIST_ID.test(raw)) {
    return { kind: "playlist", id: raw };
  }

  let url: URL;
  try {
    url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
  } catch {
    return null;
  }
  const host = url.hostname.replace(/^(www|m|music)\./, "");
  if (host !== "youtube.com" && host !== "youtu.be" && host !== "youtube-nocookie.com") return null;

  const list = url.searchParams.get("list");
  const listId = list && LIST_ID.test(list) ? list : undefined;
  const v = url.searchParams.get("v");
  if (v && VIDEO_ID.test(v))
    return listId ? { kind: "video", id: v, listId } : { kind: "video", id: v };

  const segments = url.pathname.split("/").filter(Boolean);
  if (host === "youtu.be") {
    const id = segments[0];
    if (id && VIDEO_ID.test(id))
      return listId ? { kind: "video", id, listId } : { kind: "video", id };
    return null;
  }
  if (segments[0] === "playlist") return listId ? { kind: "playlist", id: listId } : null;
  if (
    (segments[0] === "shorts" || segments[0] === "embed" || segments[0] === "live") &&
    segments[1]
  ) {
    const id = segments[1];
    if (VIDEO_ID.test(id)) return { kind: "video", id };
  }
  if (listId) return { kind: "playlist", id: listId };
  return null;
}
