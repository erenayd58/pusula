import { StatTile } from "@/components/shared/stat-tile";
import { formatCount, formatPercent } from "@/lib/format";
import type { PlanCompletion } from "../types";

/**
 * K2 "Plan uyumu" kutusu: bu haftanın yüzdesi, "N görevin M'si", geçen hafta karşılaştırması;
 * altında nötr "N görev ertelendi" (0 ise yok). Yayınlanmamış plan "—" sayılır.
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
    published?.percent === null || published?.percent === undefined
      ? "—"
      : formatPercent(published.percent);
  const detail = published
    ? `${formatCount(published.itemsTotal, "görevin")} ${published.itemsCompleted}'si`
    : thisWeek?.status === "draft"
      ? "plan taslak, yayınlanmadı"
      : "bu hafta plan yok";
  const compare =
    lastPublished && lastPublished.percent !== null
      ? `geçen hafta ${formatPercent(lastPublished.percent)}`
      : "geçen hafta plan yok";
  return (
    <StatTile
      label="Plan uyumu"
      value={value}
      hint={
        <>
          {detail} · {compare}
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
