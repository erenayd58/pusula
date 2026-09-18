"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { formatCount } from "@/lib/format";
import { prepareSuggestedPlan } from "../server/actions";

/**
 * "Önerilen planı hazırla" (08 §2 Parça 4, karar A8): yalnızca taslak ya da plan yokken;
 * önerileri müsait süreye göre günlere dağıtıp taslağa yazar (`prepareSuggestedPlan`).
 */
export function PreparePlanButton({
  studentId,
  weekStart,
  disabled,
  disabledReason,
}: {
  studentId: string;
  weekStart: string;
  disabled?: boolean;
  disabledReason?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function prepare() {
    startTransition(async () => {
      const result = await prepareSuggestedPlan({ studentId, weekStart });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      if (result.data.added === 0) {
        toast("Şu an eklenecek öneri yok.");
        return;
      }
      toast.success(
        `${formatCount(result.data.added, "görev")} eklendi${
          result.data.unscheduled > 0
            ? `; ${formatCount(result.data.unscheduled, "görev")} “bu hafta içinde”ye kondu`
            : ""
        }.`,
      );
      router.refresh();
    });
  }

  return (
    <Button
      type="button"
      variant="secondary"
      onClick={prepare}
      disabled={disabled || pending}
      title={disabled ? disabledReason : undefined}
    >
      {pending ? "Hazırlanıyor…" : "Önerilen planı hazırla"}
    </Button>
  );
}
