import Link from "next/link";
import { SubjectBadge } from "@/components/shared/subject-badge";
import { formatNet } from "@/lib/format";
import type { ExamComparison } from "../types";

/**
 * Aynı katalog denemesini giren öğrenciler × ders netleri + toplam; toplam nete göre sıralı,
 * en altta ortalama satırı. Yalnızca koç ekranı (öğrenci/veli arayüzünde sıralama yok).
 */
export function ExamComparisonTable({ comparison }: { comparison: ExamComparison }) {
  const { subjects, rows, average } = comparison;
  if (rows.length === 0) {
    return (
      <p className="rounded-sm border border-line bg-bg-paper p-6 text-small text-ink-700">
        Bu denemeyi henüz giren öğrenci yok. Öğrenci sihirbazda katalogdan seçtiğinde ya da sen
        Denemeler sekmesinden girdiğinde burada karşılaştırırsın.
      </p>
    );
  }
  return (
    <div className="overflow-x-auto rounded-sm border border-line bg-bg-paper">
      <table className="w-full text-small" data-testid="exam-comparison">
        <thead className="text-left text-micro-lg text-ink-500">
          <tr className="border-b border-line">
            <th className="px-4 py-3 font-medium">Öğrenci</th>
            {subjects.map((s) => (
              <th key={s.subjectId} className="px-3 py-3 text-right font-medium">
                <SubjectBadge color={s.color} shortName={s.shortName} />
              </th>
            ))}
            <th className="px-4 py-3 text-right font-medium">Toplam</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr
              key={r.studentId}
              data-testid="comparison-row"
              className="border-b border-line last:border-b-0"
            >
              <td className="px-4 py-3">
                <Link
                  href={`/coach/students/${r.studentId}/exams`}
                  className="font-medium text-ink-900 underline-offset-4 hover:underline"
                >
                  {r.fullName}
                </Link>
              </td>
              {subjects.map((s) => (
                <td key={s.subjectId} className="px-3 py-3 text-right text-ink-900 tabular-nums">
                  {r.nets[s.subjectId] === undefined ? "—" : formatNet(r.nets[s.subjectId]!)}
                </td>
              ))}
              <td className="px-4 py-3 text-right font-semibold text-ink-900 tabular-nums">
                {formatNet(r.totalNet)}
              </td>
            </tr>
          ))}
        </tbody>
        {average ? (
          <tfoot>
            <tr className="border-t border-line-strong bg-bg-surface">
              <th scope="row" className="px-4 py-3 text-left font-medium text-ink-700">
                Ortalama
              </th>
              {subjects.map((s) => (
                <td key={s.subjectId} className="px-3 py-3 text-right text-ink-700 tabular-nums">
                  {formatNet(average.nets[s.subjectId] ?? 0)}
                </td>
              ))}
              <td className="px-4 py-3 text-right font-semibold text-ink-700 tabular-nums">
                {formatNet(average.totalNet)}
              </td>
            </tr>
          </tfoot>
        ) : null}
      </table>
    </div>
  );
}
