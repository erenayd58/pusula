import { SubjectBadge } from "@/components/shared/subject-badge";
import { formatCount, formatPossessive } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { TopicMarkRow } from "../types";

/**
 * "En çok yanlış yaptığın konular" (öğrenci) / "Konu bazlı yanlış birikimi" (koç): son N genel
 * denemede işaret sayısına göre; "3 denemenin 2'sinde". Konu yoksa nötr not.
 */
export function TopMistakeTopics({
  rows,
  title,
  audience,
}: {
  rows: readonly TopicMarkRow[];
  title: string;
  audience: "student" | "coach";
}) {
  return (
    <section
      data-testid="top-mistake-topics"
      className="flex flex-col gap-3"
      aria-labelledby="top-mistakes-heading"
    >
      <h2 id="top-mistakes-heading" className="text-heading font-semibold text-ink-900">
        {title}
      </h2>
      {rows.length === 0 ? (
        <p className="rounded-sm border border-line bg-bg-paper p-4 text-small text-ink-700 clay:rounded-card clay:border-0 clay:clay-sm clay:bg-bg-raised">
          {audience === "student"
            ? "Son denemelerinde işaretli konu yok. Deneme girerken yanlış yaptığın konuları işaretlersen burada birikir."
            : "Son denemelerde işaretli konu yok."}
        </p>
      ) : (
        <ol
          className={cn(
            "flex flex-col divide-y divide-line rounded-sm border border-line bg-bg-paper",
            "clay:rounded-card clay:border-0 clay:clay-sm clay:bg-bg-raised",
          )}
        >
          {rows.map((r) => (
            <li key={r.topicId} className="flex items-center gap-3 px-4 py-3">
              <SubjectBadge color={r.subjectColor} shortName={r.subjectShortName} />
              <span className="min-w-0 flex-1 truncate text-small font-medium text-ink-900">
                {r.name}
              </span>
              <span className="shrink-0 text-small text-ink-700 tabular-nums">
                {audience === "coach"
                  ? `${r.count} / ${formatCount(r.exams, "deneme")}`
                  : `${formatCount(r.exams, "denemenin")} ${formatPossessive(r.count)}nde`}
              </span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
