import { SubjectBadge } from "@/components/shared/subject-badge";
import { formatCount } from "@/lib/format";
import type { TopicMistakeCount } from "../types";

/** Koç: konu bazlı defter kaydı (açık · çözüldü), açık sayısına göre; konusuz kayıtlar girmez. */
export function TopicMistakeList({ rows }: { rows: TopicMistakeCount[] }) {
  return (
    <section
      className="flex flex-col gap-3 rounded-sm border border-line bg-bg-paper p-4"
      aria-labelledby="topic-mistakes-heading"
      data-testid="topic-mistake-list"
    >
      <h2 id="topic-mistakes-heading" className="text-heading font-semibold text-ink-900">
        Konu bazlı kayıtlar
      </h2>
      {rows.length === 0 ? (
        <p className="text-small text-ink-500">Konu seçilmiş kayıt yok.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-line">
          {rows.map((r) => (
            <li key={r.topicId} className="flex items-center gap-3 py-2 text-small">
              <SubjectBadge color={r.subjectColor} shortName={r.subjectShortName} />
              <span className="min-w-0 flex-1 truncate text-ink-900">{r.topicName}</span>
              <span className="text-ink-700 tabular-nums">
                {`${formatCount(r.open, "açık")}${r.solved > 0 ? ` · ${formatCount(r.solved, "çözüldü")}` : ""}`}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
