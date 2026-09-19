import Link from "next/link";
import { ChevronRightIcon } from "lucide-react";
import { getStudentHeader } from "@/features/core";
import { formatDateTr, formatNet, formatSigned } from "@/lib/format";
import type { ModuleWidgetProps } from "@/modules/define-module";
import { listStudentResults } from "../../server/queries";

/**
 * Veli Özet kartı (10 §2 Parça 2, karar C15): "Ayşe 14 Eylül'de 71,33 net yaptı · önceki denemeye
 * göre +3,67 · Kafa Dengi Deneme 6". "Siz" dili, karşılaştırma yok, değişim nötr sayı (`ink-700`;
 * V1'deki yeşil rozet 04 §4.2 gereği yok). Genel deneme yoksa kart çizilmez. Denemeler sekmesine gider.
 */
export async function ParentLastResultWidget({ studentId }: ModuleWidgetProps) {
  const [results, student] = await Promise.all([
    listStudentResults(studentId),
    getStudentHeader(studentId),
  ]);
  const last = results.find((r) => !r.isBranch);
  if (!last) return null;
  const firstName = student?.fullName.split(" ")[0] ?? "Çocuğunuz";

  return (
    <Link
      href={`/parent/${studentId}/exams`}
      data-testid="parent-last-result"
      className="flex clay-press items-center gap-3 rounded-card clay-sm bg-bg-raised p-4"
    >
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="text-small text-ink-500">Son deneme neti</span>
        <span className="flex items-baseline gap-2">
          <span className="text-display font-semibold text-ink-900 tabular-nums">
            {formatNet(last.totalNet)}
          </span>
          <span className="text-small text-ink-700 tabular-nums">
            {last.delta === null ? "ilk deneme" : `önceki denemeye göre ${formatSigned(last.delta)}`}
          </span>
        </span>
        <span className="text-small text-ink-700">
          {`${firstName} ${formatDateTr(last.takenOn)}'de ${formatNet(last.totalNet, "net")} yaptı · ${last.title}`}
        </span>
      </span>
      <ChevronRightIcon aria-hidden="true" className="size-5 shrink-0 text-ink-500" />
    </Link>
  );
}
