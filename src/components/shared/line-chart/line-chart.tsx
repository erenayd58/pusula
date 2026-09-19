"use client";

import * as React from "react";
import { formatCount, formatNet } from "@/lib/format";
import { cn } from "@/lib/utils";
import { subjectVars, type SubjectColorToken } from "../subject-scope";
import { linePath, niceCeil, yTicks } from "./scale";

export type LineChartPoint = {
  key: string;
  /** Yatay eksen etiketi (ör. `formatDateTr`). */
  label: string;
  /** Seri id → değer; null = o noktada seri yok (çizgi kesilir). */
  values: Record<string, number | null>;
};

export type LineChartSeries = {
  id: string;
  label: string;
  /** `ink` → ink-900 (toplam); ders serileri `subjects.color` token öneki. */
  color: "ink" | SubjectColorToken | string;
  /** Kalın çizgi (toplam net 3 px; dersler 1,5 px). */
  bold?: boolean;
  /** Başlangıçta açık (karar C2: toplam açık, dersler kapalı). */
  defaultOn?: boolean;
};

const W = 640;
const PAD = { top: 14, right: 20, bottom: 30, left: 44 } as const;
const MAX_X_LABELS = 6;

/**
 * Çizgi grafiği (10 §3.2, karar C1): saf SVG, `viewBox` ile ölçeklenir (genişlik %100). Yatay eksen
 * noktalar **eşit aralıklı** (zaman ölçeği değil), dikey eksen 0 → `niceCeil(görünür serilerin en
 * büyüğü)`. Seri çipleri (`checkbox`) açar/kapar, en az bir seri açık kalır. Noktaya dokunma/tıklama
 * seçer; klavye: kap `tabindex=0`, ←/→ nokta, Home/End; seçili nokta büyür + dikey kılavuz;
 * `renderDetail` altta `aria-live="polite"` kutuda. Ekran okuyucu: `<figure aria-label={summary}>` +
 * sr-only tablo (satır = nokta, sütun = seri); görsel SVG `aria-hidden`. Hareket yok.
 * Dört noktadan azsa çağıran taraf kart listesi çizer (sayfa karar verir).
 */
export function LineChart({
  points,
  series,
  summary,
  yLabel,
  renderDetail,
  height = 240,
  className,
}: {
  points: readonly LineChartPoint[];
  series: readonly LineChartSeries[];
  summary: string;
  yLabel: string;
  renderDetail: (key: string) => React.ReactNode;
  height?: number;
  className?: string;
}) {
  const id = React.useId();
  const [on, setOn] = React.useState<ReadonlySet<string>>(() => {
    const initial = series.filter((s) => s.defaultOn).map((s) => s.id);
    return new Set(initial.length > 0 ? initial : series.slice(0, 1).map((s) => s.id));
  });
  const [selected, setSelected] = React.useState<number | null>(null);

  const visible = series.filter((s) => on.has(s.id));
  const max = Math.max(0, ...points.flatMap((p) => visible.map((s) => p.values[s.id] ?? 0)));
  const top = niceCeil(max);
  const ticks = yTicks(max);
  const innerW = W - PAD.left - PAD.right;
  const innerH = height - PAD.top - PAD.bottom;
  const n = points.length;
  const x = (i: number) => PAD.left + (n <= 1 ? innerW / 2 : (i / (n - 1)) * innerW);
  const y = (v: number) => PAD.top + innerH - (v / top) * innerH;
  const stride = Math.max(1, Math.ceil(n / MAX_X_LABELS));
  const showLabel = (i: number) => (n - 1 - i) % stride === 0;

  function toggle(seriesId: string) {
    setOn((prev) => {
      const next = new Set(prev);
      if (next.has(seriesId)) {
        if (next.size === 1) return prev;
        next.delete(seriesId);
      } else {
        next.add(seriesId);
      }
      return next;
    });
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (n === 0) return;
    const current = selected ?? n - 1;
    let next: number | null = null;
    if (e.key === "ArrowRight") next = Math.min(n - 1, selected === null ? n - 1 : current + 1);
    else if (e.key === "ArrowLeft") next = Math.max(0, selected === null ? n - 1 : current - 1);
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = n - 1;
    else if (e.key === "Escape") {
      setSelected(null);
      return;
    }
    if (next !== null) {
      e.preventDefault();
      setSelected(next);
    }
  }

  const selectedPoint = selected !== null ? points[selected] : undefined;

  return (
    <figure aria-label={summary} className={cn("flex flex-col gap-3", className)}>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Seriler">
        {series.map((s) => {
          const checked = on.has(s.id);
          const isSubject = s.color !== "ink";
          return (
            <button
              key={s.id}
              type="button"
              role="checkbox"
              aria-checked={checked}
              onClick={() => toggle(s.id)}
              style={isSubject ? subjectVars(s.color) : undefined}
              className={cn(
                "inline-flex min-h-9 items-center gap-2 rounded-xs border px-3 text-micro-lg font-medium",
                "clay:min-h-11 clay:rounded-pill clay:border-0 clay:px-4 clay:text-small clay:font-semibold",
                checked
                  ? isSubject
                    ? "border-subject bg-subject-soft text-subject-ink clay:clay-pressed"
                    : "border-ink-900 bg-ink-900 text-bg-paper clay:clay-pressed"
                  : "border-line bg-bg-paper text-ink-500 clay:clay-sm clay:bg-bg-raised",
              )}
            >
              <span
                aria-hidden="true"
                className={cn(
                  "h-1 w-4 rounded-pill",
                  isSubject ? "bg-subject" : checked ? "bg-bg-paper" : "bg-ink-900",
                  !checked && "opacity-40",
                )}
              />
              {s.label}
            </button>
          );
        })}
      </div>

      {/* Görsel: klavye gezinmesi kapta; SVG ekran okuyucuya kapalı (tablo aşağıda). */}
      <div
        tabIndex={0}
        role="group"
        aria-label={`${yLabel} grafiği; ok tuşlarıyla noktalar arasında gez`}
        onKeyDown={onKeyDown}
        className="rounded-sm outline-none focus-visible:outline-(--focus-ring)"
      >
        <svg
          aria-hidden="true"
          viewBox={`0 0 ${W} ${height}`}
          className="block h-auto w-full"
          style={{ maxHeight: height }}
        >
          {ticks.map((t) => (
            <g key={t}>
              <line
                x1={PAD.left}
                x2={W - PAD.right}
                y1={y(t)}
                y2={y(t)}
                stroke="var(--line)"
                strokeWidth={1}
              />
              <text
                x={PAD.left - 8}
                y={y(t)}
                textAnchor="end"
                dominantBaseline="middle"
                fontSize={11}
                fill="var(--ink-500)"
              >
                {Number.isInteger(t) ? formatCount(t) : formatNet(t)}
              </text>
            </g>
          ))}

          {selected !== null ? (
            <line
              x1={x(selected)}
              x2={x(selected)}
              y1={PAD.top}
              y2={PAD.top + innerH}
              stroke="var(--ink-300)"
              strokeWidth={1}
              strokeDasharray="3 3"
            />
          ) : null}

          {visible.map((s) => {
            const isSubject = s.color !== "ink";
            const stroke = isSubject ? "var(--s)" : "var(--ink-900)";
            const path = linePath(
              points.map((p, i) => {
                const v = p.values[s.id];
                return { x: x(i), y: v === null || v === undefined ? null : y(v) };
              }),
            );
            return (
              <g key={s.id} style={isSubject ? subjectVars(s.color) : undefined}>
                <path
                  d={path}
                  fill="none"
                  stroke={stroke}
                  strokeWidth={s.bold ? 3 : 1.5}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
                {points.map((p, i) => {
                  const v = p.values[s.id];
                  if (v === null || v === undefined) return null;
                  const isSelected = selected === i;
                  return (
                    <circle
                      key={p.key}
                      cx={x(i)}
                      cy={y(v)}
                      r={isSelected ? (s.bold ? 7 : 5) : s.bold ? 4.5 : 3}
                      fill={isSelected ? stroke : "var(--bg-paper)"}
                      stroke={stroke}
                      strokeWidth={s.bold ? 2.5 : 1.5}
                    />
                  );
                })}
              </g>
            );
          })}

          {points.map((p, i) => (
            <g key={p.key}>
              {showLabel(i) ? (
                <text
                  x={x(i)}
                  y={height - 8}
                  textAnchor={
                    n <= 1 ? "middle" : i === 0 ? "start" : i === n - 1 ? "end" : "middle"
                  }
                  fontSize={11}
                  fill={selected === i ? "var(--ink-900)" : "var(--ink-500)"}
                  fontWeight={selected === i ? 600 : 400}
                >
                  {p.label}
                </text>
              ) : null}
              {/* Dokunma hedefi: sütun genişliğinde şeffaf alan (44 px kuralı). */}
              <rect
                x={x(i) - (n <= 1 ? innerW / 2 : innerW / (n - 1) / 2)}
                y={PAD.top}
                width={n <= 1 ? innerW : innerW / (n - 1)}
                height={innerH + PAD.bottom}
                fill="transparent"
                className="cursor-pointer"
                onClick={() => setSelected((prev) => (prev === i ? null : i))}
              />
            </g>
          ))}
        </svg>
      </div>

      <div
        aria-live="polite"
        data-testid="line-chart-detail"
        className="min-h-12 rounded-sm bg-bg-surface px-4 py-3 text-small text-ink-900 clay:rounded-md clay:clay-well"
      >
        {selectedPoint ? (
          renderDetail(selectedPoint.key)
        ) : (
          <span className="text-ink-500">
            Bir noktaya dokun ya da ok tuşlarıyla gez; o denemenin ayrıntısı burada görünür.
          </span>
        )}
      </div>

      <table className="sr-only" aria-describedby={`${id}-caption`}>
        <caption id={`${id}-caption`}>{summary}</caption>
        <thead>
          <tr>
            <th scope="col">Deneme</th>
            {series.map((s) => (
              <th key={s.id} scope="col">
                {s.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {points.map((p) => (
            <tr key={p.key}>
              <th scope="row">{p.label}</th>
              {series.map((s) => {
                const v = p.values[s.id];
                return <td key={s.id}>{v === null || v === undefined ? "—" : formatNet(v)}</td>;
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
