import Link from "next/link";
import { ProgressBar } from "@/components/shared/progress-bar";
import { SubjectBadge } from "@/components/shared/subject-badge";
import { Badge } from "@/components/ui/badge";
import { formatCount, formatDateTr, formatPercent } from "@/lib/format";
import type { SectionRow, StudentResourceRow } from "../types";
import { StudentResourceDetail } from "./student-resource-detail";

/**
 * K2 "Kaynaklar" sekmesi (koç, flat): kitap satırı yüzde + son kayıt; `details` ile test listesi
 * (salt okunur). Öğrencinin özel kaynağı rozetle işaretli.
 */
export function ResourceProgressTable({
  rows,
  sections,
}: {
  rows: StudentResourceRow[];
  sections: SectionRow[];
}) {
  const byResource = new Map<string, SectionRow[]>();
  for (const s of sections) {
    const list = byResource.get(s.resourceId) ?? [];
    list.push(s);
    byResource.set(s.resourceId, list);
  }
  return (
    <ul
      className="flex flex-col gap-3"
      aria-label="Atanmış kaynaklar"
      data-testid="resource-progress-table"
    >
      {rows.map((r) => (
        <li key={r.resourceId} className="rounded-sm border border-line bg-bg-paper">
          <details>
            <summary className="flex cursor-pointer flex-col gap-2 p-4">
              <span className="flex flex-wrap items-center gap-2">
                {r.subjectColor && r.subjectShortName ? (
                  <SubjectBadge color={r.subjectColor} shortName={r.subjectShortName} />
                ) : (
                  <Badge>Çok dersli</Badge>
                )}
                <Link
                  href={`/coach/resources/${r.resourceId}`}
                  className="font-medium text-ink-900 underline-offset-4 hover:underline"
                >
                  {r.title}
                </Link>
                {r.isOwn ? <Badge>Öğrenci ekledi</Badge> : null}
                <span
                  className="ml-auto text-small text-ink-700 tabular-nums"
                  data-testid="resource-progress"
                >
                  {r.sectionsTotal === 0
                    ? "Test yok"
                    : `${formatPercent(r.percent ?? 0)} · ${r.sectionsDone} / ${formatCount(r.sectionsTotal, "test")}${r.lastLogDate ? ` · son ${formatDateTr(r.lastLogDate)}` : ""}`}
                </span>
              </span>
              <ProgressBar percent={r.percent ?? 0} label={`${r.title} ilerlemesi`} />
            </summary>
            <div className="border-t border-line p-4">
              <StudentResourceDetail
                resource={r}
                sections={byResource.get(r.resourceId) ?? []}
                readOnly
              />
            </div>
          </details>
        </li>
      ))}
    </ul>
  );
}
