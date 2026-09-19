import { StatTile } from "@/components/shared/stat-tile";
import { formatDateTr, formatNet, formatSigned } from "@/lib/format";
import { listStudentResults } from "../server/queries";

/**
 * K2 Genel bakış "Son deneme neti" kutusu (karar C14): `71,33` · `+3,67 · 14 Eylül · Kafa Dengi 6`.
 * Yalnızca genel denemeler; deneme yoksa "—" ve "henüz deneme yok". Trend grafiği Denemeler sekmesinde.
 */
export async function LastMockTile({ studentId }: { studentId: string }) {
  const results = await listStudentResults(studentId);
  const last = results.find((r) => !r.isBranch);
  return (
    <StatTile
      data-testid="last-mock-tile"
      label="Son deneme neti"
      value={last ? formatNet(last.totalNet) : "—"}
      hint={
        last
          ? [
              last.delta === null ? "ilk deneme" : formatSigned(last.delta),
              formatDateTr(last.takenOn),
              last.title,
            ].join(" · ")
          : "henüz deneme yok"
      }
    />
  );
}
