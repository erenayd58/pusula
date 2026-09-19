import Link from "next/link";
import { SubjectBadge } from "@/components/shared/subject-badge";
import { formatDateTr, formatNet, formatSigned } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { MockResultDetail } from "../types";

/**
 * Son genel denemenin kartı (toplam net, değişim, tarih, ad) ve ders kartları (net + değişim,
 * `SubjectBadge`; değişim ders rengi değil ink). Öğrenci ve koç yüzeyinde aynı bileşen.
 */
export function LastResultCards({ result, href }: { result: MockResultDetail; href: string }) {
  return (
    <section data-testid="last-result" aria-label="Son deneme" className="flex flex-col gap-3">
      <Link
        href={href}
        className={cn(
          "flex flex-col gap-1 rounded-sm border border-line bg-bg-paper px-4 py-3 underline-offset-4 hover:underline",
          "clay:rounded-card clay:border-0 clay:clay-md clay:bg-bg-raised clay:p-5",
        )}
      >
        <span className="text-micro-lg text-ink-500">
          {`Son deneme · ${formatDateTr(result.takenOn)} · ${result.title}`}
        </span>
        <span className="flex items-baseline gap-3">
          <span className="text-display font-semibold text-ink-900 tabular-nums">
            {formatNet(result.totalNet)}
          </span>
          <span className="text-small text-ink-700 tabular-nums">
            {result.delta === null ? "net · ilk deneme" : `net · ${formatSigned(result.delta)}`}
          </span>
        </span>
      </Link>
      <ul
        className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6"
        aria-label="Ders netleri"
      >
        {result.subjects.map((s) => (
          <li
            key={s.subjectId}
            className={cn(
              "flex flex-col gap-1.5 rounded-sm border border-line bg-bg-paper px-3 py-2.5",
              "clay:rounded-card clay:border-0 clay:clay-sm clay:bg-bg-raised",
            )}
          >
            <SubjectBadge color={s.color} shortName={s.shortName} />
            <span className="text-heading font-semibold text-ink-900 tabular-nums">
              {formatNet(s.net)}
            </span>
            <span className="text-micro-lg text-ink-700 tabular-nums">
              {s.delta === null ? "—" : formatSigned(s.delta)}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
