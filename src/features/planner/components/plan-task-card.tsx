"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { CheckIcon, ChevronRightIcon, ExternalLinkIcon } from "lucide-react";
import { toast } from "sonner";
import { useQuickLog } from "@/components/shared/quick-log-context";
import { subjectVars } from "@/components/shared/subject-scope";
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
import { cn } from "@/lib/utils";
import { KIND_SPECS } from "../lib/kinds";
import { taskMeta } from "@/lib/plan/task-title";
import { completeItem, postponeItem, setItemNote, uncompleteItem } from "../server/actions";
import type { PlanItem } from "../types";

/**
 * Öğrenci görev kartı (S4, clay): bekliyor `clay-md`, tamamlanınca `clay-sm` + fosforlu onay.
 * Onay kutusu: soru türünde hızlı kayıt sheet'ini ön dolu açar (kayıt görevi tamamlar),
 * diğerlerinde tek dokunuş. Kartın kendisi detay panelini açar: geri al, yarına ertele
 * (bir kez), kısa not, bağlantı.
 */
export function PlanTaskCard({
  item,
  canPostpone = true,
}: {
  item: PlanItem;
  /** Bugün kartında erteleme gösterilmez (plan sayfasında yapılır). */
  canPostpone?: boolean;
}) {
  const router = useRouter();
  const { open } = useQuickLog();
  const [pending, startTransition] = useTransition();
  const [detail, setDetail] = useState(false);
  const done = item.completedAt !== null;
  const spec = KIND_SPECS[item.kind];
  const Icon = spec.icon;

  function complete() {
    if (done || pending) return;
    if (spec.completeMode === "quick-log") {
      open({
        planItem: {
          id: item.id,
          title: item.title,
          subjectId: item.subjectId,
          topicId: item.topicId,
          targetValue: item.targetValue,
        },
        // Kaynak testi (Faz 7): kayıt teste bağlanır, Boş otomatik (soru sayısı = hedef).
        section:
          item.kind === "section" && item.sectionId
            ? {
                id: item.sectionId,
                title: item.title,
                resourceTitle: "",
                subjectId: item.subjectId,
                topicId: item.topicId,
                questionCount: item.targetValue,
              }
            : undefined,
      });
      return;
    }
    startTransition(async () => {
      const result = await completeItem({ id: item.id });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Görev tamamlandı.");
      router.refresh();
    });
  }

  return (
    <>
      <li
        data-testid="plan-task"
        data-done={done}
        style={subjectVars(item.subjectColor ?? "line-strong")}
        className={cn(
          "flex items-stretch gap-3 rounded-card border-l-4 border-subject bg-bg-raised p-3 transition-shadow",
          done ? "clay-sm" : "clay-md",
        )}
      >
        <button
          type="button"
          role="checkbox"
          aria-checked={done}
          aria-label={done ? `Tamamlandı: ${item.title}` : `Tamamla: ${item.title}`}
          disabled={pending}
          onClick={done ? () => setDetail(true) : complete}
          className={cn(
            "flex size-11 shrink-0 clay-press items-center justify-center self-center rounded-md",
            done ? "bg-marker text-ink-900 shadow-clay-sm" : "clay-well text-transparent",
          )}
        >
          <CheckIcon aria-hidden="true" className="size-6" />
        </button>
        <button
          type="button"
          onClick={() => setDetail(true)}
          className="flex min-w-0 flex-1 items-center gap-2 text-left"
          aria-label={`Görev detayı: ${item.title}`}
        >
          <span className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span
              className={cn(
                "text-body font-semibold text-ink-900",
                done && "text-ink-700 line-through",
              )}
            >
              {item.title}
            </span>
            <span className="text-small text-ink-500">
              {taskMeta({
                subjectName: item.subjectName,
                targetValue: item.targetValue,
                targetUnit: item.targetUnit,
                estimatedMinutes: item.estimatedMinutes,
              })}
            </span>
            {item.postponedAt ? (
              <span className="text-micro-lg text-ink-500">
                {`Ertelendi: ${item.postponedFrom ? dayOfWeekShortLabels[item.postponedFrom] : ""} → ${
                  item.dayOfWeek ? dayOfWeekShortLabels[item.dayOfWeek] : "bu hafta içinde"
                }`}
              </span>
            ) : null}
          </span>
          <Icon aria-hidden="true" className="size-4 shrink-0 text-ink-300" />
          <ChevronRightIcon aria-hidden="true" className="size-5 shrink-0 text-ink-300" />
        </button>
      </li>
      <TaskDetailSheet
        item={item}
        open={detail}
        canPostpone={canPostpone}
        onOpenChange={setDetail}
        onComplete={complete}
      />
    </>
  );
}

function TaskDetailSheet({
  item,
  open,
  canPostpone,
  onOpenChange,
  onComplete,
}: {
  item: PlanItem;
  open: boolean;
  canPostpone: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [note, setNote] = useState(item.studentNote ?? "");
  const done = item.completedAt !== null;
  const canPostponeNow = canPostpone && !done && item.dayOfWeek !== null && !item.postponedAt;

  function run(
    action: () => Promise<{ ok: true; message: string } | { ok: false; error: string }>,
  ) {
    startTransition(async () => {
      const r = await action();
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success(r.message);
      onOpenChange(false);
      router.refresh();
    });
  }

  return (
    <ResponsiveSheet open={open} onOpenChange={onOpenChange}>
      <ResponsiveSheetContent
        className="sm:max-w-md"
        style={subjectVars(item.subjectColor ?? "line-strong")}
      >
        <ResponsiveSheetHeader>
          <ResponsiveSheetTitle>{item.title}</ResponsiveSheetTitle>
          <ResponsiveSheetDescription>
            {taskMeta({
              subjectName: item.subjectName,
              targetValue: item.targetValue,
              targetUnit: item.targetUnit,
              estimatedMinutes: item.estimatedMinutes,
            })}
            {done ? " · tamamlandı" : ""}
          </ResponsiveSheetDescription>
        </ResponsiveSheetHeader>

        <div className="flex flex-col gap-3">
          {item.kind === "link" && item.url ? (
            <Button asChild variant="secondary">
              <a href={item.url} target="_blank" rel="noopener noreferrer">
                <ExternalLinkIcon aria-hidden="true" />
                Bağlantıyı aç
              </a>
            </Button>
          ) : null}

          {!done ? (
            <Button type="button" onClick={onComplete} disabled={pending}>
              {KIND_SPECS[item.kind].completeMode === "quick-log"
                ? "Tamamla ve soruları gir"
                : "Tamamla"}
            </Button>
          ) : (
            <Button
              type="button"
              variant="secondary"
              disabled={pending}
              onClick={() =>
                run(async () => {
                  const r = await uncompleteItem({ id: item.id });
                  if (!r.ok) return r;
                  return {
                    ok: true,
                    message:
                      r.data.unlinkedLogs > 0
                        ? "Tamamlama geri alındı. Soru kaydın duruyor, sadece görevle bağı kaldırıldı."
                        : "Tamamlama geri alındı.",
                  };
                })
              }
            >
              Tamamlamayı geri al
            </Button>
          )}

          {canPostponeNow ? (
            <Button
              type="button"
              variant="secondary"
              disabled={pending}
              onClick={() =>
                run(async () => {
                  const r = await postponeItem({ id: item.id });
                  if (!r.ok) return r;
                  return {
                    ok: true,
                    message:
                      r.data.dayOfWeek === null
                        ? "Görev “bu hafta içinde”ye taşındı."
                        : `Görev ${dayOfWeekShortLabels[r.data.dayOfWeek]} gününe ertelendi.`,
                  };
                })
              }
            >
              Yarına ertele
            </Button>
          ) : item.postponedAt && !done ? (
            <p className="text-small text-ink-500">
              Bu görev bir kez ertelendi; tekrar ertelenemez.
            </p>
          ) : null}

          <div className="flex flex-col gap-2">
            <label htmlFor={`note-${item.id}`} className="text-small font-medium text-ink-900">
              Kısa not (koçun görür)
            </label>
            <textarea
              id={`note-${item.id}`}
              rows={2}
              maxLength={200}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="ör. Son 5 soruda zorlandım."
              className="w-full rounded-md clay-well px-4 py-3 text-body text-ink-900 placeholder:text-ink-300"
            />
            <div>
              <Button
                type="button"
                variant="secondary"
                disabled={pending || note.trim() === (item.studentNote ?? "").trim()}
                onClick={() =>
                  run(async () => {
                    const r = await setItemNote({ id: item.id, note });
                    if (!r.ok) return r;
                    return { ok: true, message: "Not kaydedildi." };
                  })
                }
              >
                Notu kaydet
              </Button>
            </div>
          </div>
        </div>

        <ResponsiveSheetFooter>
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            Kapat
          </Button>
        </ResponsiveSheetFooter>
      </ResponsiveSheetContent>
    </ResponsiveSheet>
  );
}
