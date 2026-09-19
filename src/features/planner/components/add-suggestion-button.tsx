"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { CalendarPlusIcon } from "lucide-react";
import { toast } from "sonner";
import { FormError } from "@/components/shared/form-error";
import { Button } from "@/components/ui/button";
import {
  ResponsiveSheet,
  ResponsiveSheetContent,
  ResponsiveSheetDescription,
  ResponsiveSheetFooter,
  ResponsiveSheetHeader,
  ResponsiveSheetTitle,
} from "@/components/ui/responsive-sheet";
import { dayOfWeekShortLabels } from "@/content/labels";
import { formatDuration } from "@/lib/format";
import { cn } from "@/lib/utils";
import { addPlanItems } from "../server/actions";
import type { PoolTask } from "../types";

const DAYS: (number | null)[] = [null, 1, 2, 3, 4, 5, 6, 7];

/**
 * "Plana ekle" (08 §2 Parça 4): öneriyi bu haftanın planına ön dolu görev olarak ekler; plan
 * yoksa taslak açılır. İsteğe bağlı gün seçimi (varsayılan "bu hafta içinde" = `null`).
 * Analytics listelerinin `action` yuvasına sayfa tarafından takılır (analytics planner'ı
 * import etmez).
 */
export function AddSuggestionButton({
  studentId,
  weekStart,
  task,
  weekLabel,
}: {
  studentId: string;
  /** Hedef hafta (pazartesi); sayfa İstanbul'a göre bu haftayı verir. */
  weekStart: string;
  task: PoolTask;
  /** Açıklama satırı için: "Bu hafta" ya da "23 Eylül haftası". */
  weekLabel?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [day, setDay] = useState<number | null>(null);
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  function submit() {
    setError(undefined);
    startTransition(async () => {
      const result = await addPlanItems({
        studentId,
        weekStart,
        days: [day],
        kind: task.kind,
        title: task.title,
        subjectId: task.subjectId,
        topicId: task.topicId,
        url: task.url ?? "",
        targetValue: task.targetValue,
        targetUnit: task.targetUnit,
        estimatedMinutes: task.estimatedMinutes,
        sectionId: task.sectionId ?? null,
        videoId: task.videoId ?? null,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      toast.success("Görev plana eklendi.");
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <>
      <Button
        type="button"
        variant="secondary"
        onClick={() => setOpen(true)}
        aria-label={`Plana ekle: ${task.title}`}
      >
        <CalendarPlusIcon aria-hidden="true" />
        Plana ekle
      </Button>
      <ResponsiveSheet open={open} onOpenChange={setOpen}>
        <ResponsiveSheetContent className="sm:max-w-md">
          <ResponsiveSheetHeader>
            <ResponsiveSheetTitle>Plana ekle</ResponsiveSheetTitle>
            <ResponsiveSheetDescription>
              {task.title} · {formatDuration(task.estimatedMinutes)}
              {weekLabel ? ` · ${weekLabel}` : ""}
            </ResponsiveSheetDescription>
          </ResponsiveSheetHeader>

          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1.5 text-micro-lg text-ink-500">Gün</legend>
            <div className="flex flex-wrap gap-2" role="group" aria-label="Gün">
              {DAYS.map((d) => (
                <button
                  key={String(d)}
                  type="button"
                  disabled={pending}
                  aria-pressed={d === day}
                  onClick={() => setDay(d)}
                  className={cn(
                    "min-h-[38px] rounded-xs border px-3 text-small font-medium pointer-coarse:min-h-11",
                    d === day
                      ? "border-ink-900 bg-ink-900 text-bg-paper"
                      : "border-line bg-bg-paper text-ink-700 hover:bg-bg-surface disabled:text-ink-300",
                    "focus-visible:outline-2 focus-visible:outline-focus",
                  )}
                >
                  {d === null ? "Bu hafta içinde" : dayOfWeekShortLabels[d]}
                </button>
              ))}
            </div>
          </fieldset>
          <FormError message={error} />

          <ResponsiveSheetFooter>
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
              Vazgeç
            </Button>
            <Button type="button" onClick={submit} disabled={pending}>
              {pending ? "Ekleniyor…" : "Görevi ekle"}
            </Button>
          </ResponsiveSheetFooter>
        </ResponsiveSheetContent>
      </ResponsiveSheet>
    </>
  );
}
