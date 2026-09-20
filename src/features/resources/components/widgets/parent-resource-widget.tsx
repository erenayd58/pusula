import { formatCount, formatPercent, formatPossessive } from "@/lib/format";
import type { ParentSummaryWidgetProps } from "@/modules/define-module";
import { listStudentResources } from "../../server/queries";

/**
 * Veli Özet kartı (Faz 8, karar E9; 11 §6 kancası; order 60): "3 kitapta 120 testin 41'i bitti · %34".
 * Testi olan atanmış kaynaklar (özel dahil; veli çocuğunun özelini görür). Kaynak yoksa kart yok.
 */
export async function ParentResourceWidget({ studentId }: ParentSummaryWidgetProps) {
  const rows = (await listStudentResources(studentId)).filter((r) => r.sectionsTotal > 0);
  if (rows.length === 0) return null;
  const total = rows.reduce((s, r) => s + r.sectionsTotal, 0);
  const done = rows.reduce((s, r) => s + r.sectionsDone, 0);
  const percent = total > 0 ? Math.floor((done * 100) / total) : 0;
  return (
    <section
      aria-label="Kaynaklar"
      data-testid="parent-resources"
      className="flex flex-col gap-1 rounded-card clay-sm bg-bg-raised p-4"
    >
      <span className="text-small text-ink-500">Kaynaklar</span>
      <p className="text-body text-ink-900">
        {`${formatCount(rows.length, "kitapta")} ${formatCount(total, "testin")} ${formatPossessive(done)} bitti · ${formatPercent(percent)}`}
      </p>
    </section>
  );
}
