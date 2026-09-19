import { SubjectBadge } from "@/components/shared/subject-badge";
import { calculateNet } from "@/lib/exam/net";
import { formatCount, formatDateTr, formatNet } from "@/lib/format";
import type { QuestionLogRow } from "../types";

/** Koç Sorular sekmesi (flat): tarih, ders, konu, D/Y/B, toplam, net, süre. Telefonda yatay kaydırma. */
export function QuestionLogTable({
  rows,
  wrongPenalty,
}: {
  rows: QuestionLogRow[];
  wrongPenalty: number;
}) {
  if (rows.length === 0) {
    return (
      <p className="rounded-sm border border-line bg-bg-paper p-6 text-small text-ink-700">
        Bu aralıkta kayıt yok.
      </p>
    );
  }
  const total = rows.reduce((s, r) => s + r.total, 0);
  const net = rows.reduce(
    (s, r) => s + calculateNet({ correct: r.correct, wrong: r.wrong, wrongPenalty }),
    0,
  );

  return (
    <div className="overflow-x-auto rounded-sm border border-line bg-bg-paper">
      <table className="w-full text-small">
        <thead className="text-left text-micro-lg text-ink-500">
          <tr className="border-b border-line">
            <th className="px-4 py-3 font-medium">Tarih</th>
            <th className="px-4 py-3 font-medium">Ders</th>
            <th className="px-4 py-3 font-medium">Konu</th>
            <th className="px-4 py-3 text-right font-medium">D / Y / B</th>
            <th className="px-4 py-3 text-right font-medium">Toplam</th>
            <th className="px-4 py-3 text-right font-medium">Net</th>
            <th className="px-4 py-3 text-right font-medium">Süre</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-b border-line last:border-b-0">
              <td className="px-4 py-2.5 whitespace-nowrap text-ink-700">
                {formatDateTr(r.logDate)}
              </td>
              <td className="px-4 py-2.5">
                <SubjectBadge color={r.subjectColor} shortName={r.subjectShortName} />
              </td>
              <td className="px-4 py-2.5 text-ink-900">
                {r.topicName ?? "—"}
                {r.sectionLabel ? (
                  <span className="block text-micro-lg text-ink-500">{r.sectionLabel}</span>
                ) : null}
              </td>
              <td className="px-4 py-2.5 text-right whitespace-nowrap text-ink-700">
                {`${r.correct} / ${r.wrong} / ${r.blank}`}
              </td>
              <td className="px-4 py-2.5 text-right text-ink-900">{r.total}</td>
              <td className="px-4 py-2.5 text-right text-ink-900">
                {formatNet(calculateNet({ correct: r.correct, wrong: r.wrong, wrongPenalty }))}
              </td>
              <td className="px-4 py-2.5 text-right text-ink-700">
                {r.durationMinutes ? `${r.durationMinutes} dk` : "—"}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot className="text-ink-900">
          <tr className="border-t border-line-strong font-medium">
            <td className="px-4 py-2.5" colSpan={4}>
              {formatCount(rows.length, "kayıt")}
            </td>
            <td className="px-4 py-2.5 text-right">{total}</td>
            <td className="px-4 py-2.5 text-right">{formatNet(net)}</td>
            <td />
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
