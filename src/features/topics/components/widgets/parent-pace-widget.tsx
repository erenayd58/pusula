import { getStudentHeader } from "@/features/core";
import { paceSentence } from "@/lib/strategy/pace";
import type { ParentSummaryWidgetProps } from "@/modules/define-module";
import { getStudentPaceSummary } from "../../server/queries";

/**
 * Veli Özet kartı (12 §2 Adım 6, order 30; 09 §5 kancası): gidişat cümlesi "siz" dili, üçüncü
 * tekil — "54 konunun 9'u bitti · Ayşe takvimin 3 konu gerisinde". Hedef yoksa yalnızca sayım;
 * yargı, uyarı rengi, karşılaştırma yok. Şablon yoksa kart çizilmez.
 */
export async function ParentPaceWidget({ studentId }: ParentSummaryWidgetProps) {
  const [summary, student] = await Promise.all([
    getStudentPaceSummary(studentId),
    getStudentHeader(studentId),
  ]);
  if (!summary || summary.pace.total === 0) return null;
  const name = student?.fullName.split(" ")[0] ?? "Çocuğunuz";
  return (
    <section
      aria-label="Konu gidişatı"
      data-testid="parent-pace"
      className="flex flex-col gap-1 rounded-card clay-sm bg-bg-raised p-4"
    >
      <span className="text-small text-ink-500">Konular</span>
      <p className="text-body text-ink-900">
        {paceSentence(summary.pace, summary.hasTargets, { audience: "parent", name })}
      </p>
    </section>
  );
}
