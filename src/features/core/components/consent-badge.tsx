import { HourglassIcon, ShieldCheckIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { consentSourceLabels } from "@/content/labels";
import { formatDateTr } from "@/lib/format";
import type { ConsentStatus } from "../server/queries";

/**
 * Öğrenci başlığında onay durumu (koç). Eksik onay bir hata değil, bekleyen iş: nötr ton,
 * ikon + metin. Tam onayda kaynak ve tarih `title` ile verilir.
 */
export function ConsentBadge({ status }: { status: ConsentStatus }) {
  if (status.complete && status.latest) {
    return (
      <Badge
        tone="success"
        title={`${consentSourceLabels[status.latest.source]} · ${formatDateTr(status.latest.givenAt, { year: true })} · ${status.latest.documentVersion}`}
      >
        <ShieldCheckIcon aria-hidden="true" />
        Veli onayı var
      </Badge>
    );
  }
  return (
    <Badge tone="neutral">
      <HourglassIcon aria-hidden="true" />
      Veli onayı bekleniyor
    </Badge>
  );
}
