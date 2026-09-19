import { SubjectBadge } from "@/components/shared/subject-badge";
import { formatCount, formatNet, formatSigned } from "@/lib/format";
import type { SubjectProgressRow } from "../types";

/** K2 "Ders bazlı net gelişimi": ders · son · önceki · son N ortalaması · değişim (nötr sayı). */
export function SubjectProgressTable({
  rows,
  recentCount,
}: {
  rows: readonly SubjectProgressRow[];
  recentCount: number;
}) {
  return (
    <div className="overflow-x-auto rounded-sm border border-line bg-bg-paper">
      <table className="w-full text-small" data-testid="subject-progress-table">
        <thead className="text-left text-micro-lg text-ink-500">
          <tr className="border-b border-line">
            <th className="px-4 py-3 font-medium">Ders</th>
            <th className="px-3 py-3 text-right font-medium">Son</th>
            <th className="px-3 py-3 text-right font-medium">Önceki</th>
            <th className="px-3 py-3 text-right font-medium">{`Son ${formatCount(recentCount)} ort.`}</th>
            <th className="px-4 py-3 text-right font-medium">Değişim</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.subjectId} className="border-b border-line last:border-b-0">
              <td className="px-4 py-3">
                <SubjectBadge color={r.color} shortName={r.shortName} />
              </td>
              <td className="px-3 py-3 text-right font-semibold text-ink-900 tabular-nums">
                {r.last === null ? "—" : formatNet(r.last)}
              </td>
              <td className="px-3 py-3 text-right text-ink-700 tabular-nums">
                {r.prev === null ? "—" : formatNet(r.prev)}
              </td>
              <td className="px-3 py-3 text-right text-ink-700 tabular-nums">
                {r.avg === null ? "—" : formatNet(r.avg)}
              </td>
              <td className="px-4 py-3 text-right text-ink-900 tabular-nums">
                {r.delta === null ? "—" : formatSigned(r.delta)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
