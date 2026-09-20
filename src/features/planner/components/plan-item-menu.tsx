"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { CopyIcon, PencilIcon, Trash2Icon } from "lucide-react";
import { toast } from "sonner";
import { DayChips, type DayChoice } from "@/components/shared/day-chips";
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
import { cn } from "@/lib/utils";
import { addPlanItems, deletePlanItem, movePlanItem } from "../server/actions";
import type { PlanItem } from "../types";

const DAYS: (number | null)[] = [1, 2, 3, 4, 5, 6, 7, null];

/**
 * Görev menüsü (ikincil eylemler, 08 §2 Parça 2): düzenle, başka güne / "bu hafta içinde"ye
 * taşı (gün çipleri), başka günlere kopyala (kısayol: aynı görevi her güne tek tek girmek
 * yerine; gün çipleri + "Hafta içi / Her gün"), sil (onaylı). Sürükle-bırakın klavye/dokunma
 * alternatifi de budur.
 */
export function PlanItemMenu({
  item,
  studentId,
  weekStart,
  onOpenChange,
  onEdit,
}: {
  item: PlanItem | null;
  studentId: string;
  weekStart: string;
  onOpenChange: (open: boolean) => void;
  onEdit: (item: PlanItem) => void;
}) {
  return (
    <ResponsiveSheet open={item !== null} onOpenChange={onOpenChange}>
      <ResponsiveSheetContent className="sm:max-w-md">
        {item ? (
          <Body
            key={item.id}
            item={item}
            studentId={studentId}
            weekStart={weekStart}
            onOpenChange={onOpenChange}
            onEdit={onEdit}
          />
        ) : null}
      </ResponsiveSheetContent>
    </ResponsiveSheet>
  );
}

function Body({
  item,
  studentId,
  weekStart,
  onOpenChange,
  onEdit,
}: {
  item: PlanItem;
  studentId: string;
  weekStart: string;
  onOpenChange: (open: boolean) => void;
  onEdit: (item: PlanItem) => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [copying, setCopying] = useState(false);
  const [copyDays, setCopyDays] = useState<DayChoice[]>([]);
  const [error, setError] = useState<string>();

  /** Aynı görevi (tamamlanma ve not hariç) seçili günlere yeni satır olarak ekler. */
  function copy() {
    if (copyDays.length === 0) return;
    setError(undefined);
    startTransition(async () => {
      const result = await addPlanItems({
        studentId,
        weekStart,
        days: copyDays,
        kind: item.kind,
        title: item.title,
        subjectId: item.subjectId,
        topicId: item.topicId,
        url: item.url ?? "",
        targetValue: item.targetValue,
        targetUnit: item.targetUnit,
        estimatedMinutes: item.estimatedMinutes,
        sectionId: item.sectionId,
        videoId: item.videoId,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      toast.success(
        copyDays.length > 1 ? `Görev ${copyDays.length} güne kopyalandı.` : "Görev kopyalandı.",
      );
      onOpenChange(false);
      router.refresh();
    });
  }

  function move(day: number | null) {
    if (day === item.dayOfWeek) return;
    setError(undefined);
    startTransition(async () => {
      const result = await movePlanItem({ id: item.id, studentId, dayOfWeek: day, index: 999 });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      toast.success(
        day === null
          ? "Görev “bu hafta içinde”ye taşındı."
          : `Görev ${dayOfWeekShortLabels[day]} gününe taşındı.`,
      );
      onOpenChange(false);
      router.refresh();
    });
  }

  function remove() {
    setError(undefined);
    startTransition(async () => {
      const result = await deletePlanItem({ id: item.id, studentId });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      toast.success("Görev silindi.");
      onOpenChange(false);
      router.refresh();
    });
  }

  return (
    <>
      <ResponsiveSheetHeader>
        <ResponsiveSheetTitle>{item.title}</ResponsiveSheetTitle>
        <ResponsiveSheetDescription>
          {item.dayOfWeek ? dayOfWeekShortLabels[item.dayOfWeek] : "Bu hafta içinde"}
          {item.completedAt ? " · tamamlandı" : ""}
        </ResponsiveSheetDescription>
      </ResponsiveSheetHeader>

      <div className="flex flex-col gap-4">
        <div className="flex gap-2">
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              onOpenChange(false);
              onEdit(item);
            }}
          >
            <PencilIcon aria-hidden="true" />
            Düzenle
          </Button>
          <Button
            type="button"
            variant="secondary"
            aria-expanded={copying}
            onClick={() => setCopying((v) => !v)}
            disabled={pending}
          >
            <CopyIcon aria-hidden="true" />
            Kopyala
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => setConfirmDelete(true)}
            disabled={pending}
          >
            <Trash2Icon aria-hidden="true" />
            Sil
          </Button>
        </div>

        {copying ? (
          <div className="flex flex-col gap-3 rounded-xs border border-line bg-bg-surface p-3">
            <DayChips
              label="Kopyalanacak günler"
              value={copyDays}
              onChange={setCopyDays}
              withWeekOnly
              disabledDays={[item.dayOfWeek]}
              disabled={pending}
            />
            <div>
              <Button type="button" onClick={copy} disabled={pending || copyDays.length === 0}>
                {pending
                  ? "Kopyalanıyor…"
                  : copyDays.length > 1
                    ? `${copyDays.length} güne kopyala`
                    : "Kopyala"}
              </Button>
            </div>
          </div>
        ) : null}

        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1.5 text-micro-lg text-ink-500">Taşı</legend>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Güne taşı">
            {DAYS.map((d) => (
              <button
                key={String(d)}
                type="button"
                disabled={pending || d === item.dayOfWeek}
                aria-pressed={d === item.dayOfWeek}
                onClick={() => move(d)}
                className={cn(
                  "min-h-[38px] rounded-xs border px-3 text-small font-medium pointer-coarse:min-h-11",
                  d === item.dayOfWeek
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

        {confirmDelete ? (
          <p className="rounded-xs border border-line bg-bg-surface px-3 py-2 text-small text-ink-700">
            {item.completedAt
              ? "Görev silinecek; öğrencinin soru kaydı varsa kayıt kalır, bağ kopar."
              : "Görev silinecek. Bu işlem geri alınamaz."}
          </p>
        ) : null}
        <FormError message={error} />
      </div>

      <ResponsiveSheetFooter>
        <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
          Kapat
        </Button>
        {confirmDelete ? (
          <Button type="button" onClick={remove} disabled={pending}>
            {pending ? "Siliniyor…" : "Görevi sil"}
          </Button>
        ) : null}
      </ResponsiveSheetFooter>
    </>
  );
}
