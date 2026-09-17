"use client";

import * as React from "react";
import { useCallback, useRef, useState } from "react";
import { subjectVars } from "@/components/shared/subject-scope";
import { topicStatusLabels } from "@/content/labels";
import { formatPercent } from "@/lib/format";
import { cn } from "@/lib/utils";
import { completionPercent } from "../lib/completion";
import { topicStatusValues } from "../schemas";
import type { TopicMap as TopicMapData, TopicMapCell } from "../types";
import { TopicCell, TopicSwatch } from "./topic-cell";
import { TopicDetailSheet, type TopicDetailSelection } from "./topic-detail-sheet";

type Pos = { si: number; ti: number };

/**
 * Konu haritası (04 Bölüm 9). Telefonda ders ders clay kartlar, hücreler sarmalanır;
 * masaüstünde (lg) tek ızgara: solda sabit ders etiketi, sağda hücreler (sığmazsa satır içinde sarmalanır, kart dışına taşmaz). Koç (flat) yüzeyinde
 * aynı bileşen clay'siz ve daha küçük hücreyle çizilir. Ok tuşlarıyla hücreler arasında gezilir
 * (roving tabindex); Enter/Space detayı açar. Kayıt sonrası yerel durum güncellenir.
 */
export function TopicMap({
  map,
  studentId,
  audience,
}: {
  map: TopicMapData;
  studentId: string;
  audience: "student" | "coach";
}) {
  const [subjects, setSubjects] = useState(map.subjects);
  const [selected, setSelected] = useState<Pos | null>(null);
  const [focused, setFocused] = useState<Pos>({ si: 0, ti: 0 });
  const cellRefs = useRef(new Map<string, HTMLButtonElement>());

  const key = (p: Pos) => `${p.si}:${p.ti}`;

  const focusCell = useCallback((p: Pos) => {
    setFocused(p);
    cellRefs.current.get(key(p))?.focus();
  }, []);

  function onKeyDown(event: React.KeyboardEvent, p: Pos) {
    const row = subjects[p.si];
    if (!row) return;
    let next: Pos | null = null;
    switch (event.key) {
      case "ArrowRight":
        next = p.ti + 1 < row.topics.length ? { si: p.si, ti: p.ti + 1 } : null;
        break;
      case "ArrowLeft":
        next = p.ti > 0 ? { si: p.si, ti: p.ti - 1 } : null;
        break;
      case "ArrowDown":
      case "ArrowUp": {
        const si = event.key === "ArrowDown" ? p.si + 1 : p.si - 1;
        const target = subjects[si];
        if (target && target.topics.length > 0) {
          next = { si, ti: Math.min(p.ti, target.topics.length - 1) };
        }
        break;
      }
      case "Home":
        next = { si: p.si, ti: 0 };
        break;
      case "End":
        next = { si: p.si, ti: row.topics.length - 1 };
        break;
      default:
        return;
    }
    event.preventDefault();
    if (next) focusCell(next);
  }

  function onSaved(
    topicId: string,
    patch: Pick<TopicMapCell, "status" | "confidence" | "completedAt">,
  ) {
    setSubjects((prev) =>
      prev.map((s) => ({
        ...s,
        topics: s.topics.map((t) => (t.topicId === topicId ? { ...t, ...patch } : t)),
      })),
    );
  }

  const selection: TopicDetailSelection | null = (() => {
    if (!selected) return null;
    const subject = subjects[selected.si];
    const cell = subject?.topics[selected.ti];
    return subject && cell ? { subject, cell } : null;
  })();

  return (
    <>
      <div
        className={cn(
          "flex flex-col gap-4",
          "lg:gap-0 clay:lg:clay-card clay:lg:p-5",
          "flat:gap-0 flat:rounded-sm flat:border flat:border-line flat:bg-bg-paper flat:px-4 flat:py-1",
        )}
      >
        {subjects.map((subject, si) => {
          const pct = completionPercent(subject.topics.map((t) => t.status));
          const headingId = `topic-map-subject-${subject.subjectId}`;
          return (
            <section
              key={subject.subjectId}
              aria-labelledby={headingId}
              style={subjectVars(subject.color)}
              className={cn(
                "flex flex-col gap-3",
                "clay:clay-card clay:p-4 clay:lg:rounded-none clay:lg:bg-transparent clay:lg:p-0 clay:lg:shadow-none",
                "lg:grid lg:grid-cols-[200px_minmax(0,1fr)] lg:items-center lg:gap-6 lg:border-b lg:border-line lg:py-3 lg:last:border-b-0",
                "flat:border-b flat:border-line flat:py-3 flat:last:border-b-0",
              )}
            >
              <header className="flex flex-col gap-2">
                <div className="flex items-center justify-between gap-3">
                  <h2
                    id={headingId}
                    className="flex items-center gap-2 text-heading font-semibold clay:lg:text-body flat:text-body"
                  >
                    <span aria-hidden="true" className="h-4 w-1 rounded-pill bg-subject" />
                    {subject.name}
                  </h2>
                  <span className="text-small font-semibold text-subject-ink">
                    <span className="sr-only">Tamamlanma </span>
                    {formatPercent(pct)}
                  </span>
                </div>
                <div
                  role="progressbar"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={pct}
                  aria-label={`${subject.name} tamamlanma`}
                  className="h-1.5 w-full overflow-hidden rounded-pill bg-bg-sunken clay:clay-well flat:h-1"
                >
                  <div className="h-full rounded-pill bg-subject" style={{ width: `${pct}%` }} />
                </div>
              </header>
              <div
                className="flex min-w-0 flex-wrap gap-2 flat:gap-1.5"
                role="group"
                aria-labelledby={headingId}
              >
                {subject.topics.map((cell, ti) => {
                  const pos = { si, ti };
                  const isFocusStop = focused.si === si && focused.ti === ti;
                  return (
                    <TopicCell
                      key={cell.topicId}
                      ref={(el) => {
                        if (el) cellRefs.current.set(key(pos), el);
                        else cellRefs.current.delete(key(pos));
                      }}
                      name={cell.name}
                      status={cell.status}
                      selected={selected?.si === si && selected?.ti === ti}
                      tabIndex={isFocusStop ? 0 : -1}
                      onFocus={() => setFocused(pos)}
                      onKeyDown={(e) => onKeyDown(e, pos)}
                      onClick={() => setSelected(pos)}
                    />
                  );
                })}
                {subject.topics.length === 0 ? (
                  <p className="text-small text-ink-500">Bu derste henüz konu yok.</p>
                ) : null}
              </div>
            </section>
          );
        })}
      </div>

      <TopicDetailSheet
        selection={selection}
        studentId={studentId}
        audience={audience}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
        onSaved={onSaved}
      />
    </>
  );
}

/** Ders dışı örnek hücreler ders rengi taşımaz (04 Bölüm 4.2): nötr mürekkep tonu. */
const NEUTRAL_VARS = {
  "--s": "var(--ink-700)",
  "--s-soft": "var(--bg-sunken)",
  "--s-ink": "var(--ink-900)",
} as React.CSSProperties;

/** Durum açıklaması: 5 durumun küçük örneği + etiketi (bilgi sadece renkle verilmez). */
export function TopicLegend({ className }: { className?: string }) {
  return (
    <ul
      aria-label="Durum açıklaması"
      className={cn("flex flex-wrap gap-x-4 gap-y-2 text-micro-lg text-ink-700", className)}
      style={NEUTRAL_VARS}
    >
      {topicStatusValues.map((status) => (
        <li key={status} className="flex items-center gap-1.5">
          <TopicSwatch status={status} className="size-5" />
          {topicStatusLabels[status]}
        </li>
      ))}
    </ul>
  );
}
