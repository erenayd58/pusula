"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
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
import { formatCount, formatWeekRange } from "@/lib/format";
import { cn } from "@/lib/utils";
import { copyPlan } from "../server/actions";

export type CopyTarget = { studentId: string; fullName: string; existingItems: number };

/**
 * Üç kopyalama eylemi için ortak onay penceresi (karar A3):
 * - others: bu planı başka öğrencilere (aynı hafta), öğrenci seçimi
 * - last-week: geçen haftanın planını bu haftaya (kendi öğrencisi)
 * - carry-over: tamamlanmayanları gelecek haftaya (kendi öğrencisi)
 * Her hedef satırı "Ad: N mevcut + M eklenecek" gösterir.
 */
export type CopyDialogState =
  | {
      mode: "others";
      sourcePlanId: string;
      weekStart: string;
      sourceItems: number;
      targets: CopyTarget[];
    }
  | {
      mode: "last-week" | "carry-over";
      sourcePlanId: string;
      weekStart: string;
      sourceItems: number;
      target: CopyTarget;
    }
  | null;

const TITLES = {
  others: "Başka öğrencilere kopyala",
  "last-week": "Geçen haftayı kopyala",
  "carry-over": "Tamamlanmayanları aktar",
} as const;

export function CopyPlanDialog({
  state,
  onOpenChange,
}: {
  state: CopyDialogState;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <ResponsiveSheet open={state !== null} onOpenChange={onOpenChange}>
      <ResponsiveSheetContent className="sm:max-w-md">
        {state ? (
          <Body
            key={`${state.mode}-${state.sourcePlanId}-${state.weekStart}`}
            state={state}
            onOpenChange={onOpenChange}
          />
        ) : null}
      </ResponsiveSheetContent>
    </ResponsiveSheet>
  );
}

function Body({
  state,
  onOpenChange,
}: {
  state: NonNullable<CopyDialogState>;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string>();
  const allTargets = state.mode === "others" ? state.targets : [state.target];
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(state.mode === "others" ? [] : [allTargets[0]!.studentId]),
  );
  const rows = allTargets.filter((t) => state.mode !== "others" || selected.has(t.studentId));

  function confirm() {
    if (rows.length === 0) {
      setError("En az bir öğrenci seç.");
      return;
    }
    setError(undefined);
    startTransition(async () => {
      const result = await copyPlan({
        sourcePlanId: state.sourcePlanId,
        targetStudentIds: rows.map((r) => r.studentId),
        weekStart: state.weekStart,
        onlyIncomplete: state.mode === "carry-over",
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      const added = result.data.copied.reduce((s, c) => s + c.added_items, 0);
      toast.success(
        state.mode === "others"
          ? `Plan ${formatCount(result.data.copied.length, "öğrenciye")} kopyalandı.`
          : `${formatCount(added, "görev")} eklendi.`,
      );
      onOpenChange(false);
      router.refresh();
    });
  }

  return (
    <>
      <ResponsiveSheetHeader>
        <ResponsiveSheetTitle>{TITLES[state.mode]}</ResponsiveSheetTitle>
        <ResponsiveSheetDescription>
          {`Hedef hafta ${formatWeekRange(state.weekStart)}. Kaynaktan ${formatCount(state.sourceItems, "görev")}; hedefte plan varsa görevler sona eklenir, tamamlama ve erteleme bilgisi taşınmaz.`}
        </ResponsiveSheetDescription>
      </ResponsiveSheetHeader>

      <ul className="flex flex-col gap-1.5" aria-label="Hedef öğrenciler">
        {allTargets.map((t) => {
          const checked = state.mode !== "others" || selected.has(t.studentId);
          const line = `${t.fullName}: ${t.existingItems} mevcut + ${state.sourceItems} eklenecek`;
          return (
            <li key={t.studentId}>
              {state.mode === "others" ? (
                <label
                  className={cn(
                    "flex min-h-[38px] cursor-pointer items-center gap-3 rounded-xs border border-line bg-bg-paper px-3 text-small pointer-coarse:min-h-11",
                    checked && "border-ink-900 bg-bg-surface",
                  )}
                >
                  <input
                    type="checkbox"
                    className="size-4 accent-ink-900"
                    checked={checked}
                    onChange={(e) =>
                      setSelected((prev) => {
                        const next = new Set(prev);
                        if (e.target.checked) next.add(t.studentId);
                        else next.delete(t.studentId);
                        return next;
                      })
                    }
                  />
                  <span className="tabular-nums">{line}</span>
                </label>
              ) : (
                <p className="rounded-xs border border-line bg-bg-surface px-3 py-2 text-small tabular-nums">
                  {line}
                </p>
              )}
            </li>
          );
        })}
        {allTargets.length === 0 ? (
          <li className="text-small text-ink-500">Kopyalanacak başka öğrenci yok.</li>
        ) : null}
      </ul>

      <FormError message={error} />

      <ResponsiveSheetFooter>
        <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
          Vazgeç
        </Button>
        <Button type="button" onClick={confirm} disabled={pending || allTargets.length === 0}>
          {pending ? "Kopyalanıyor…" : state.mode === "others" ? "Kopyala" : "Aktar"}
        </Button>
      </ResponsiveSheetFooter>
    </>
  );
}
