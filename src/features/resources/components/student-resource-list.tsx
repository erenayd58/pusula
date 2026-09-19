import Link from "next/link";
import { ProgressBar } from "@/components/shared/progress-bar";
import { SubjectBadge } from "@/components/shared/subject-badge";
import { Badge } from "@/components/ui/badge";
import { resourceTypeLabels } from "@/content/labels";
import { formatCount, formatPercent } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { StudentResourceRow } from "../types";

/**
 * Öğrencinin kaynak kartları (clay): ders rozeti / "Çok dersli", ad, yayınevi, ilerleme çubuğu
 * (`ink-900`; ders rengi ve fosforlu yok — 11 §3.4) + "%42 · 17 / 40 test". Koç K2'de aynı
 * bileşen flat yüzeyde (`basePath` ile bağlantısız).
 */
export function StudentResourceList({
  rows,
  basePath,
}: {
  rows: StudentResourceRow[];
  /** Verilirse kart `${basePath}/${resourceId}` bağlantısı olur. */
  basePath?: string;
}) {
  return (
    <ul className="grid gap-3 sm:grid-cols-2" aria-label="Kaynaklar" data-testid="resource-list">
      {rows.map((r) => {
        const body = (
          <>
            <div className="flex items-center gap-2">
              {r.subjectColor && r.subjectShortName ? (
                <SubjectBadge color={r.subjectColor} shortName={r.subjectShortName} />
              ) : (
                <Badge>Çok dersli</Badge>
              )}
              {r.isOwn ? <Badge>Sen ekledin</Badge> : null}
              <span className="ml-auto text-micro-lg text-ink-500">
                {resourceTypeLabels[r.type]}
              </span>
            </div>
            <span className="line-clamp-2 text-body font-semibold text-ink-900">{r.title}</span>
            {r.publisher ? <span className="text-small text-ink-500">{r.publisher}</span> : null}
            <ProgressBar
              percent={r.percent ?? 0}
              label={`${r.title} ilerlemesi`}
              className="mt-1"
            />
            <span className="text-small text-ink-700 tabular-nums" data-testid="resource-progress">
              {r.sectionsTotal === 0
                ? "Henüz test yok"
                : `${formatPercent(r.percent ?? 0)} · ${r.sectionsDone} / ${formatCount(r.sectionsTotal, "test")}`}
            </span>
          </>
        );
        const className = cn(
          "flex h-full flex-col gap-1.5 rounded-sm border border-line bg-bg-paper p-4",
          "clay:rounded-card clay:border-0 clay:clay-md clay:bg-bg-raised",
          basePath && "clay:clay-press",
        );
        return (
          <li key={r.resourceId} data-testid="resource-card">
            {basePath ? (
              <Link href={`${basePath}/${r.resourceId}`} className={className}>
                {body}
              </Link>
            ) : (
              <div className={className}>{body}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
