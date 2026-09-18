"use client";

import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { InfoIcon, PlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { dayOfWeekShortLabels } from "@/content/labels";
import { formatDateTr, formatDuration } from "@/lib/format";
import { cn } from "@/lib/utils";
import { dayMinutes, isOverbooked } from "../lib/plan-summary";
import type { PlanItem } from "../types";
import { PlanItemCard } from "./plan-item-card";

/** Sütun kimliği: dnd-kit için "day-1".."day-7" ve "day-any". */
export const columnId = (day: number | null) => `day-${day ?? "any"}`;
export const dayFromColumnId = (id: string): number | null | undefined => {
  const m = /^day-(\d|any)$/.exec(id);
  if (!m) return undefined;
  return m[1] === "any" ? null : Number(m[1]);
};

export type DayHeaderInfo = {
  date: string;
  busy: { label: string; start: number; end: number; kind: string }[];
  availableMinutes: number;
  allDayBusy: boolean;
};

/**
 * Gün sütunu (K3): başlıkta tarih, meşguliyet etiketleri, müsait ve planlanan süre (aşımda
 * nötr metin, engel yok); sürükle-bırak hedefi; altta "Görev ekle". "Bu hafta içinde" sütunu
 * için `day = null` (müsait süre yok).
 */
export function DayColumn({
  day,
  info,
  items,
  readOnly,
  wide,
  onAdd,
  onMenu,
}: {
  day: number | null;
  info: DayHeaderInfo | null;
  items: PlanItem[];
  readOnly: boolean;
  /** Havuz açıkken (yatay kaydırma var) sütun daha geniş; kapalıyken 8 sütun 1440 px'e sığar. */
  wide?: boolean;
  onAdd: (day: number | null) => void;
  onMenu: (item: PlanItem) => void;
}) {
  const id = columnId(day);
  const { setNodeRef, isOver } = useDroppable({ id, disabled: readOnly });
  const planned = dayMinutes(items, day);
  const over = info ? !info.allDayBusy && isOverbooked(planned, info.availableMinutes) : false;

  return (
    <section
      aria-labelledby={`${id}-heading`}
      data-testid={id}
      className={cn(
        "flex min-h-[320px] flex-1 basis-0 flex-col rounded-sm border border-line bg-bg-surface",
        wide ? "min-w-[160px]" : "min-w-[112px]",
        isOver && "border-ink-900",
      )}
    >
      <header className="flex flex-col gap-1 border-b border-line px-2 py-2">
        <div className="flex items-baseline justify-between gap-2">
          <h3 id={`${id}-heading`} className="text-small font-semibold text-ink-900">
            {day === null ? "Bu hafta içinde" : dayOfWeekShortLabels[day]}
          </h3>
          {info ? (
            <span className="text-micro-lg text-ink-500">{formatDateTr(info.date)}</span>
          ) : null}
        </div>
        {info ? (
          <>
            {info.busy.length > 0 ? (
              <ul className="flex flex-wrap gap-1">
                {info.busy.map((b, i) => (
                  <li
                    key={`${b.start}-${i}`}
                    className="rounded-pill bg-bg-sunken px-1.5 py-0.5 text-micro text-ink-700"
                  >
                    {b.label}
                  </li>
                ))}
              </ul>
            ) : null}
            {info.allDayBusy ? (
              <p className="text-micro-lg text-ink-500">Tüm gün meşgul</p>
            ) : (
              <p className="flex flex-col text-micro-lg text-ink-500 tabular-nums">
                <span>{`Müsait ${formatDuration(info.availableMinutes)}`}</span>
                <span>{`Planlı ${formatDuration(planned)}`}</span>
              </p>
            )}
            {over ? (
              <p className="flex items-center gap-1 text-micro-lg text-ink-700">
                <InfoIcon aria-hidden="true" className="size-3.5" />
                Planlanan süre müsait süreyi aşıyor
              </p>
            ) : null}
          </>
        ) : (
          <p className="text-micro-lg text-ink-500 tabular-nums">
            {items.length > 0 ? `Planlı ${formatDuration(planned)}` : "Güne bağlı olmayan görevler"}
          </p>
        )}
      </header>

      <SortableContext
        id={id}
        items={items.map((i) => i.id)}
        strategy={verticalListSortingStrategy}
      >
        <ul ref={setNodeRef} className="flex flex-1 flex-col gap-2 p-2">
          {items.map((item) => (
            <PlanItemCard key={item.id} item={item} readOnly={readOnly} onMenu={onMenu} />
          ))}
          {items.length === 0 ? (
            <li
              aria-hidden="true"
              className={cn(
                "flex flex-1 items-center justify-center rounded-xs border border-dashed border-line-strong p-3 text-micro-lg text-ink-300",
                isOver && "border-ink-900 text-ink-700",
              )}
            >
              Buraya bırak
            </li>
          ) : null}
        </ul>
      </SortableContext>

      {!readOnly ? (
        <div className="border-t border-line p-2">
          <Button type="button" variant="ghost" className="w-full" onClick={() => onAdd(day)}>
            <PlusIcon aria-hidden="true" />
            Görev ekle
          </Button>
        </div>
      ) : null}
    </section>
  );
}
