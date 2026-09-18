import Link from "next/link";
import { StatTile } from "@/components/shared/stat-tile";
import { formatCount, formatPossessive } from "@/lib/format";
import { topicPace, type PaceInput, type PaceTopic } from "@/lib/strategy/pace";
import type { StudentTargets } from "../types";

/**
 * K2 özet kutusu (Faz 5b): "54 konunun 9'u · takvimin 3 konu gerisinde · bu hızla sınava 6 konu
 * eksik"; hedef yoksa "Hedef kurulmadı → Hedef sekmesi". Ders dışı metrik: ders rengi yok,
 * uyarı rengi yok. Sunucu bileşeni.
 */
export function PaceTile({ targets, pace }: { targets: StudentTargets; pace: PaceInput }) {
  const topics: PaceTopic[] = targets.topics.map((t) => ({
    topicId: t.topicId,
    subjectId: t.subjectId,
    done: t.done,
    completedAt: t.completedAt,
    targetOn: t.targetOn,
  }));
  const p = topicPace(topics, pace);
  const hasTargets = targets.topicsFinishBy !== null;

  if (!hasTargets) {
    return (
      <StatTile
        data-testid="pace-tile"
        label="Konu takvimi"
        value={`${formatCount(p.total, "konunun")} ${formatPossessive(p.done)}`}
        hint={
          <>
            Hedef kurulmadı ·{" "}
            <Link
              href={`/coach/students/${targets.studentId}/target`}
              className="font-medium text-ink-900 underline underline-offset-4"
            >
              Hedef sekmesi
            </Link>
          </>
        }
      />
    );
  }

  const calendar =
    p.overdue > 0
      ? `takvimin ${formatCount(p.overdue, "konu")} gerisinde`
      : p.ahead > 0
        ? `takvimin ${formatCount(p.ahead, "konu")} ilerisinde`
        : "takvimle uyumlu";
  const exam =
    pace.examOn === null
      ? null
      : p.shortfall > 0
        ? `bu hızla sınava ${formatCount(p.shortfall, "konu")} eksik`
        : p.total - p.done === 0
          ? "tüm konular bitti"
          : "bu hızla sınava yetişiyor";

  return (
    <StatTile
      data-testid="pace-tile"
      label="Konu takvimi"
      value={`${formatCount(p.total, "konunun")} ${formatPossessive(p.done)}`}
      hint={
        <>
          {calendar}
          {exam ? (
            <>
              <br />
              {exam}
            </>
          ) : null}
        </>
      }
    />
  );
}
