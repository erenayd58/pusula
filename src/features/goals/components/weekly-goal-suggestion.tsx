"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { FormError } from "@/components/shared/form-error";
import { Button } from "@/components/ui/button";
import { formatCount } from "@/lib/format";
import { applyWeeklyGoalSuggestion } from "../server/actions";

/**
 * "Haftalık hedefi buna göre öner" (Faz 5b, karar B13): `ceil(kalan soru / kalan hafta)`
 * gösterilir — "Önerilen haftalık hedef: 320 soru (şu an 300)" — koç "Uygula" der, mevcut
 * `setGoals` yolu yazar. Otomatik değil.
 */
export function WeeklyGoalSuggestion({
  studentId,
  remainingQuestions,
  weeksToExam,
  currentWeekly,
}: {
  studentId: string;
  remainingQuestions: number;
  weeksToExam: number;
  currentWeekly: number | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string>();
  const suggested = Math.max(
    1,
    Math.ceil(Math.max(0, remainingQuestions) / Math.max(1, weeksToExam)),
  );

  function apply() {
    setError(undefined);
    startTransition(async () => {
      const result = await applyWeeklyGoalSuggestion({ studentId, weekly: suggested });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      toast.success(`Haftalık hedef ${formatCount(suggested, "soru")} olarak kaydedildi.`);
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-3 rounded-sm border border-line bg-bg-paper p-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-heading font-semibold text-ink-900">Haftalık hedef</h2>
        <p className="text-small text-ink-500">
          {currentWeekly === null
            ? "Şu an haftalık soru hedefi yok."
            : `Şu anki haftalık hedef: ${formatCount(currentWeekly, "soru")}.`}{" "}
          Kalan soru ve sınava kalan haftaya göre öneri alabilirsin; otomatik değişmez.
        </p>
      </div>
      {open ? (
        <p data-testid="weekly-goal-suggestion" className="text-small text-ink-900">
          {`Önerilen haftalık hedef: ${formatCount(suggested, "soru")} (şu an ${currentWeekly === null ? "yok" : formatCount(currentWeekly)})`}
        </p>
      ) : null}
      <FormError message={error} />
      <div className="flex flex-wrap gap-2">
        {open ? (
          <>
            <Button type="button" onClick={apply} disabled={pending}>
              {pending ? "Uygulanıyor…" : "Uygula"}
            </Button>
            <Button type="button" variant="ghost" disabled={pending} onClick={() => setOpen(false)}>
              Vazgeç
            </Button>
          </>
        ) : (
          <Button type="button" variant="secondary" onClick={() => setOpen(true)}>
            Haftalık hedefi buna göre öner
          </Button>
        )}
      </div>
    </div>
  );
}
