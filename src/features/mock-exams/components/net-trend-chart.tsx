"use client";

import {
  LineChart,
  type LineChartPoint,
  type LineChartSeries,
} from "@/components/shared/line-chart/line-chart";
import { netDeltas, trendSummary, type MockPoint } from "@/lib/exam/mock";
import { formatDateTr, formatNet, formatSigned } from "@/lib/format";
import type { MockSubject } from "../types";

const TOTAL = "total";

/**
 * Net trend grafiği: `LineChart` sarmalayıcısı. Seriler toplam net (ink, kalın, açık) + dersler
 * (ders rengi, kapalı; karar C2; telefon/tablette "Dersleri göster" arkasında). Nokta detayı: deneme adı, tarih, toplam net ve değişim, ders
 * netleri. Dört noktadan azsa sayfa `ResultCardList` çizer.
 */
export function NetTrendChart({
  points,
  subjects,
  audience = "student",
}: {
  points: readonly MockPoint[];
  subjects: readonly MockSubject[];
  /** Veli yüzeyinde "siz" dili (ipucu metni). */
  audience?: "student" | "coach" | "parent";
}) {
  const deltas = netDeltas(points);
  const chartPoints: LineChartPoint[] = points.map((p) => ({
    key: p.resultId,
    label: formatDateTr(p.takenOn),
    values: {
      [TOTAL]: p.totalNet,
      ...Object.fromEntries(
        subjects.map((s) => [
          s.subjectId,
          p.subjects.find((r) => r.subjectId === s.subjectId)?.net ?? null,
        ]),
      ),
    },
  }));
  const series: LineChartSeries[] = [
    { id: TOTAL, label: "Toplam net", color: "ink", bold: true, defaultOn: true },
    ...subjects.map((s) => ({ id: s.subjectId, label: s.shortName, color: s.color })),
  ];
  const byKey = new Map(points.map((p) => [p.resultId, p]));

  return (
    <LineChart
      points={chartPoints}
      series={series}
      summary={trendSummary(points)}
      yLabel="Net"
      secondaryToggle={{ show: "Dersleri göster", hide: "Dersleri gizle" }}
      hint={
        audience === "parent"
          ? "Bir noktaya dokunun ya da ok tuşlarıyla gezin; o denemenin ayrıntısı burada görünür."
          : undefined
      }
      renderDetail={(key) => {
        const p = byKey.get(key);
        if (!p) return null;
        const delta = deltas.get(key) ?? null;
        return (
          <div className="flex flex-col gap-1">
            <p className="font-medium text-ink-900">
              {`${p.title} · ${formatDateTr(p.takenOn, { year: true })}`}
            </p>
            <p className="tabular-nums">
              {`Toplam net ${formatNet(p.totalNet)}`}
              {delta !== null ? ` · önceki denemeye göre ${formatSigned(delta)}` : ""}
            </p>
            <p className="text-micro-lg text-ink-500 tabular-nums">
              {p.subjects
                .map((r) => {
                  const s = subjects.find((x) => x.subjectId === r.subjectId);
                  return `${s?.shortName ?? "?"} ${formatNet(r.net)}`;
                })
                .join(" · ")}
            </p>
          </div>
        );
      }}
    />
  );
}
