"use client";

import { useRouter } from "next/navigation";
import { useOptimistic, useTransition } from "react";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { parentRelationLabels } from "@/content/labels";
import { formatDateTr } from "@/lib/format";
import { setParentDetails } from "../server/student-actions";
import type { StudentParentRow } from "../server/queries";

/**
 * K2 Genel bakış "Veliler" kartı (12 §2 Adım 6, karar E8): bağlı veliler (ad, ilişki, bağlanma
 * tarihi) ve "Yanlış defterini görebilir" anahtarı (`student_parents.can_view_details`; varsayılan
 * kapalı). Veli yoksa davet ipucu (davet düğmesi başlıkta).
 */
export function ParentVisibilityCard({
  studentId,
  parents,
}: {
  studentId: string;
  parents: StudentParentRow[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [optimistic, setOptimistic] = useOptimistic(
    parents,
    (state, next: { parentId: string; canViewDetails: boolean }) =>
      state.map((p) => (p.parentId === next.parentId ? { ...p, ...next } : p)),
  );

  function toggle(parentId: string, canViewDetails: boolean) {
    startTransition(async () => {
      setOptimistic({ parentId, canViewDetails });
      const result = await setParentDetails({ studentId, parentId, canViewDetails });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(
        canViewDetails ? "Veli yanlış defterini görebilir." : "Yanlış defteri veliye kapatıldı.",
      );
      router.refresh();
    });
  }

  return (
    <section
      aria-labelledby="parents-heading"
      className="flex flex-col gap-3 rounded-sm border border-line bg-bg-paper p-4"
      data-testid="parent-visibility"
    >
      <h2 id="parents-heading" className="text-heading font-semibold text-ink-900">
        Veliler
      </h2>
      {optimistic.length === 0 ? (
        <p className="text-small text-ink-700">
          Henüz bağlı veli yok. Başlıktaki “Veli davet et” ile davet kodu üret.
        </p>
      ) : (
        <ul className="divide-y divide-line">
          {optimistic.map((p) => {
            const switchId = `parent-details-${p.parentId}`;
            return (
              <li key={p.parentId} className="flex items-start justify-between gap-4 py-3">
                <div className="flex min-w-0 flex-col gap-0.5">
                  <span className="text-body font-medium text-ink-900">{p.fullName}</span>
                  <span className="text-small text-ink-700">
                    {parentRelationLabels[p.relation]} · {formatDateTr(p.linkedAt, { year: true })}
                  </span>
                  <Label htmlFor={switchId} className="text-micro-lg text-ink-500">
                    Yanlış defterini görebilir (fotoğraflar dahil; varsayılan kapalı)
                  </Label>
                </div>
                <div className="flex shrink-0 items-center p-2">
                  <Switch
                    id={switchId}
                    checked={p.canViewDetails}
                    disabled={pending}
                    aria-label={`${p.fullName} yanlış defterini görebilir`}
                    onCheckedChange={(next) => toggle(p.parentId, next)}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
