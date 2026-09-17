"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { CheckIcon, GripVerticalIcon, MoreHorizontalIcon } from "lucide-react";
import { subjectVars } from "@/components/shared/subject-scope";
import { dayOfWeekShortLabels } from "@/content/labels";
import { cn } from "@/lib/utils";
import { KIND_SPECS } from "../lib/kinds";
import { taskMeta } from "../lib/task-title";
import type { PlanItem } from "../types";

/**
 * Koç görev kartı (flat, K3): ders şeridi, başlık, meta; tamamlanmış ve ertelenmiş işaretleri
 * nötr; sürüklenebilir (fare + klavye sensörü) ve "…" menüsü. Renk yalnızca dersi söyler.
 */
export function PlanItemCard({
  item,
  readOnly,
  onMenu,
}: {
  item: PlanItem;
  readOnly: boolean;
  onMenu: (item: PlanItem) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id, disabled: readOnly });
  const Icon = KIND_SPECS[item.kind].icon;

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      data-testid="plan-item"
      className={cn(
        "flex items-stretch gap-2 rounded-xs border border-line bg-bg-paper",
        isDragging && "opacity-90 shadow-drag",
        item.completedAt && "border-marker bg-marker-soft/40",
      )}
    >
      <span
        aria-hidden="true"
        className="w-1 shrink-0 rounded-l-xs bg-subject"
        style={subjectVars(item.subjectColor ?? "line-strong")}
      />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5 py-2">
        <span className="flex items-start gap-1.5">
          <Icon aria-hidden="true" className="mt-0.5 size-3.5 shrink-0 text-ink-500" />
          <span className="text-small font-medium break-words text-ink-900">{item.title}</span>
        </span>
        <span className="text-micro-lg text-ink-500">
          {taskMeta({
            subjectName: item.subjectShortName,
            targetValue: item.targetValue,
            targetUnit: item.targetUnit,
            estimatedMinutes: item.estimatedMinutes,
          })}
        </span>
        {item.completedAt ? (
          <span className="flex items-center gap-1 text-micro-lg font-medium text-ink-700">
            <CheckIcon aria-hidden="true" className="size-3.5" />
            Tamamlandı
          </span>
        ) : null}
        {item.postponedAt ? (
          <span className="text-micro-lg text-ink-500">
            {`Ertelendi: ${item.postponedFrom ? dayOfWeekShortLabels[item.postponedFrom] : "—"} → ${
              item.dayOfWeek ? dayOfWeekShortLabels[item.dayOfWeek] : "hafta içi"
            }`}
          </span>
        ) : null}
        {item.studentNote ? (
          <span className="text-micro-lg text-ink-700">“{item.studentNote}”</span>
        ) : null}
      </div>
      {!readOnly ? (
        <div className="flex shrink-0 flex-col items-center justify-between py-1 pr-1">
          <button
            type="button"
            ref={setActivatorNodeRef}
            aria-label={`Taşı: ${item.title}`}
            className="flex size-7 cursor-grab items-center justify-center rounded-xs text-ink-300 hover:bg-bg-surface hover:text-ink-700 focus-visible:outline-2 focus-visible:outline-focus active:cursor-grabbing"
            {...attributes}
            {...listeners}
          >
            <GripVerticalIcon aria-hidden="true" className="size-4" />
          </button>
          <button
            type="button"
            aria-label={`Görev menüsü: ${item.title}`}
            onClick={() => onMenu(item)}
            className="flex size-7 items-center justify-center rounded-xs text-ink-500 hover:bg-bg-surface hover:text-ink-900 focus-visible:outline-2 focus-visible:outline-focus"
          >
            <MoreHorizontalIcon aria-hidden="true" className="size-4" />
          </button>
        </div>
      ) : null}
    </li>
  );
}
