import Link from "next/link";
import { ChevronRightIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { mockExamKindLabels } from "@/content/labels";
import { formatDateTr, formatNet, formatSigned } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { MockResultSummary } from "../types";

/**
 * Tüm denemeler listesi (en yeni önce): tarih, ad, tür rozeti (branşta "Branş · Mat"), toplam net
 * ve değişim (genel). Satır detaya gider.
 */
export function ResultList({
  results,
  basePath,
}: {
  results: readonly MockResultSummary[];
  basePath: string;
}) {
  return (
    <ol
      data-testid="result-list"
      aria-label="Tüm denemeler"
      className={cn(
        "flex flex-col divide-y divide-line rounded-sm border border-line bg-bg-paper",
        "clay:rounded-card clay:border-0 clay:clay-sm clay:bg-bg-raised",
      )}
    >
      {results.map((r) => (
        <li key={r.id} data-testid="result-row">
          <Link
            href={`${basePath}/${r.id}`}
            className="flex min-h-14 items-center gap-3 px-4 py-3 underline-offset-4 hover:underline"
          >
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-small font-medium text-ink-900">{r.title}</span>
              <span className="flex flex-wrap items-center gap-2 text-micro-lg text-ink-500">
                <span>{formatDateTr(r.takenOn, { year: true })}</span>
                {r.branchSubject ? (
                  <Badge>{`${mockExamKindLabels.branch} · ${r.branchSubject.shortName}`}</Badge>
                ) : null}
              </span>
            </span>
            <span className="flex shrink-0 flex-col items-end tabular-nums">
              <span className="text-heading font-semibold text-ink-900">
                {formatNet(r.totalNet)}
              </span>
              <span className="text-micro-lg text-ink-700">
                {r.delta === null ? "" : formatSigned(r.delta)}
              </span>
            </span>
            <ChevronRightIcon aria-hidden="true" className="size-4 shrink-0 text-ink-300" />
          </Link>
        </li>
      ))}
    </ol>
  );
}
