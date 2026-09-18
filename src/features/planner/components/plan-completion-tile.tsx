import { StatTile } from "@/components/shared/stat-tile";
import { formatCount, formatPercent } from "@/lib/format";
import type { PlanCompletion } from "../types";

/**
 * K2 "Plan uyumu" kutusu: büyük değer bugüne kadarki oran (bugün ve öncesindeki günler +
 * tamamlanmış "bu hafta içinde" görevleri), altında hafta geneli ("N görevin M'si"), geçen
 * haftayla karşılaştırma ve nötr "N görev ertelendi" (0 ise yok). Yayınlanmamış plan "—".
 */
export function PlanCompletionTile({
  thisWeek,
  lastWeek,
}: {
  thisWeek: PlanCompletion | null;
  lastWeek: PlanCompletion | null;
}) {
  const published = thisWeek?.status === "published" ? thisWeek : null;
  const lastPublished = lastWeek?.status === "published" ? lastWeek : null;
  const value =
    published?.toDatePercent === null || published?.toDatePercent === undefined
      ? "—"
      : formatPercent(published.toDatePercent);
  const toDate = published
    ? `bugüne kadar ${formatCount(published.toDateTotal, "görevin")} ${published.toDateCompleted}'si`
    : thisWeek?.status === "draft"
      ? "plan taslak, yayınlanmadı"
      : "bu hafta plan yok";
  const week = published
    ? `hafta geneli ${published.percent === null ? "—" : formatPercent(published.percent)} (${formatCount(published.itemsTotal, "görevin")} ${published.itemsCompleted}'si)`
    : null;
  const compare =
    lastPublished && lastPublished.percent !== null
      ? `geçen hafta ${formatPercent(lastPublished.percent)}`
      : "geçen hafta plan yok";
  return (
    <StatTile
      label="Plan uyumu (bugüne kadar)"
      value={value}
      hint={
        <>
          {toDate}
          {week ? (
            <>
              <br />
              {week}
            </>
          ) : null}
          <br />
          {compare}
          {published && published.postponedCount > 0 ? (
            <>
              <br />
              {`${formatCount(published.postponedCount, "görev")} ertelendi`}
            </>
          ) : null}
        </>
      }
    />
  );
}
