import { formatCount, formatPossessive } from "@/lib/format";
import type { ParentSummaryWidgetProps } from "@/modules/define-module";
import { listStudentPlaylists } from "../../server/queries";

/**
 * Veli Özet kartı (Faz 8, karar E9; 11 §6 kancası; order 61): "2 listede 12 videonun 5'i izlendi".
 * Videosu olan atanmış listeler. Liste yoksa kart yok.
 */
export async function ParentVideoWidget({ studentId }: ParentSummaryWidgetProps) {
  const rows = (await listStudentPlaylists(studentId)).filter((r) => r.videosTotal > 0);
  if (rows.length === 0) return null;
  const total = rows.reduce((s, r) => s + r.videosTotal, 0);
  const watched = rows.reduce((s, r) => s + r.videosWatched, 0);
  return (
    <section
      aria-label="Videolar"
      data-testid="parent-videos"
      className="flex flex-col gap-1 rounded-card clay-sm bg-bg-raised p-4"
    >
      <span className="text-small text-ink-500">Videolar</span>
      <p className="text-body text-ink-900">
        {`${formatCount(rows.length, "listede")} ${formatCount(total, "videonun")} ${formatPossessive(watched)} izlendi`}
      </p>
    </section>
  );
}
