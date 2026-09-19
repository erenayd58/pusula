import { formatCount, formatDuration } from "@/lib/format";
import type { ParentSummaryWidgetProps } from "@/modules/define-module";
import { getWeekTotals } from "../../server/queries";

/**
 * Veli Özet kartı (V1; 12 §2 Adım 6, order 20): iki kutu — "612 · soru çözdü", "14 sa 20 dk ·
 * çalışma süresi". Ders dışı metrik: ders rengi yok, `clay-sm`. Kayıt yoksa tek nötr cümle.
 */
export async function ParentWeekStatsWidget({ studentId, weekStart }: ParentSummaryWidgetProps) {
  const totals = await getWeekTotals(studentId, weekStart);
  if (totals.questions === 0 && totals.studyMinutes === 0) {
    return (
      <p
        data-testid="parent-week-stats"
        className="rounded-card clay-sm bg-bg-raised p-4 text-body text-ink-700"
      >
        Bu hafta henüz soru kaydı yok.
      </p>
    );
  }
  return (
    <div className="grid grid-cols-2 gap-3" data-testid="parent-week-stats">
      <Tile value={formatCount(totals.questions)} label="soru çözdü" />
      <Tile
        value={totals.studyMinutes > 0 ? formatDuration(totals.studyMinutes) : "—"}
        label={totals.studyMinutes > 0 ? "çalışma süresi" : "süre girilmedi"}
      />
    </div>
  );
}

function Tile({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex flex-col gap-0.5 rounded-card clay-sm bg-bg-raised p-4">
      <span className="text-title font-semibold text-ink-900 tabular-nums">{value}</span>
      <span className="text-small text-ink-500">{label}</span>
    </div>
  );
}
