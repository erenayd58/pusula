"use client";

import { useState } from "react";
import { MessageSquareTextIcon } from "lucide-react";
import { dayOfWeekLabels, dayOfWeekShortLabels } from "@/content/labels";
import { formatDateTr, formatDuration } from "@/lib/format";
import { cn } from "@/lib/utils";
import { completedCount, dayMinutes } from "../lib/plan-summary";
import type { PlanItem, WeekPlan } from "../types";
import { PlanTaskCard } from "./plan-task-card";
import { ReflectionForm } from "./reflection-form";

/**
 * S4 öğrenci plan ekranı (clay): gün seçici (işaretli günlerde nokta; bugün varsayılan),
 * seçili günün görevleri ve toplam süresi, "Bu hafta içinde" bölümü, koçun mesajı,
 * "Haftam nasıl geçti?" (cumartesiden hafta sonuna kadar düzenlenebilir, karar A9).
 */
export function StudentPlan({
  plan,
  dates,
  todayDay,
  coachName,
  reflectionMode,
}: {
  plan: WeekPlan;
  /** Gün → tarih (YYYY-MM-DD). */
  dates: Record<number, string>;
  /** Bu haftaysa bugünün günü (1–7), değilse null. */
  todayDay: number | null;
  coachName: string | null;
  reflectionMode: "hidden" | "editable" | "readonly";
}) {
  const [selected, setSelected] = useState<number>(todayDay ?? 1);
  const dayItems = plan.items.filter((i) => i.dayOfWeek === selected);
  const anytime = plan.items.filter((i) => i.dayOfWeek === null);
  const markedDays = new Set(
    plan.items.map((i) => i.dayOfWeek).filter((d): d is number => d !== null),
  );

  return (
    <div className="flex flex-col gap-6">
      <div role="tablist" aria-label="Gün seç" className="grid grid-cols-7 gap-2">
        {[1, 2, 3, 4, 5, 6, 7].map((d) => {
          const active = d === selected;
          const dayList = plan.items.filter((i) => i.dayOfWeek === d);
          const allDone = dayList.length > 0 && dayList.every((i) => i.completedAt !== null);
          return (
            <button
              key={d}
              type="button"
              role="tab"
              aria-selected={active}
              aria-label={`${dayOfWeekLabels[d]}, ${formatDateTr(dates[d] ?? plan.weekStart)}${
                dayList.length ? `, ${dayList.length} görev` : ""
              }`}
              onClick={() => setSelected(d)}
              className={cn(
                "flex min-h-[64px] clay-press flex-col items-center justify-center gap-0.5 rounded-md",
                active ? "clay-pressed bg-bg-surface" : "clay-sm",
                d === todayDay && "ring-2 ring-ink-900 ring-inset",
              )}
            >
              <span className="text-micro-lg text-ink-500">{dayOfWeekShortLabels[d]}</span>
              <span className="text-heading font-semibold text-ink-900 tabular-nums">
                {dates[d]?.slice(8) ?? ""}
              </span>
              <span
                aria-hidden="true"
                className={cn(
                  "size-1.5 rounded-pill",
                  markedDays.has(d) ? (allDone ? "bg-marker" : "bg-ink-900") : "bg-transparent",
                )}
              />
            </button>
          );
        })}
      </div>

      <section aria-labelledby="day-heading" className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between gap-2">
          <h2 id="day-heading" className="text-heading font-semibold text-ink-900">
            {formatDateTr(dates[selected] ?? plan.weekStart, { weekday: true })}
          </h2>
          {dayItems.length > 0 ? (
            <span className="text-small text-ink-500 tabular-nums">
              {`${completedCount(dayItems)} / ${dayItems.length} · ${formatDuration(dayMinutes(dayItems, selected))}`}
            </span>
          ) : null}
        </div>
        {dayItems.length === 0 ? (
          <p className="rounded-card clay-sm p-4 text-small text-ink-700">
            Bu güne görev yok. “Bu hafta içinde” listesine bakabilirsin.
          </p>
        ) : (
          <TaskList items={dayItems} />
        )}
      </section>

      <section aria-labelledby="anytime-heading" className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between gap-2">
          <h2 id="anytime-heading" className="text-heading font-semibold text-ink-900">
            Bu hafta içinde
          </h2>
          {anytime.length > 0 ? (
            <span className="text-small text-ink-500 tabular-nums">
              {`${completedCount(anytime)} / ${anytime.length} · ${formatDuration(dayMinutes(anytime, null))}`}
            </span>
          ) : null}
        </div>
        {anytime.length === 0 ? (
          <p className="text-small text-ink-500">Güne bağlı olmayan görev yok.</p>
        ) : (
          <TaskList items={anytime} />
        )}
      </section>

      {plan.coachMessage ? (
        <section
          aria-label="Koçunun haftalık mesajı"
          className="flex flex-col gap-2 rounded-card border-l-4 border-ink-900 clay-md p-4"
        >
          <p className="flex items-center gap-2 text-small font-semibold text-ink-900">
            <MessageSquareTextIcon aria-hidden="true" className="size-4 text-ink-700" />
            Koçunun haftalık mesajı
            {coachName ? <span className="font-normal text-ink-500">· {coachName}</span> : null}
          </p>
          <p className="text-body text-ink-900">“{plan.coachMessage}”</p>
        </section>
      ) : null}

      {reflectionMode !== "hidden" ? (
        <ReflectionForm
          planId={plan.id}
          initial={plan.studentReflection}
          readOnly={reflectionMode === "readonly"}
        />
      ) : null}
    </div>
  );
}

function TaskList({ items }: { items: PlanItem[] }) {
  return (
    <ul className="flex flex-col gap-3">
      {items.map((item) => (
        <PlanTaskCard key={item.id} item={item} />
      ))}
    </ul>
  );
}
