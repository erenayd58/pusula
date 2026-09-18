"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { CalendarClockIcon, CalendarOffIcon, PencilIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ResponsiveSheet,
  ResponsiveSheetContent,
  ResponsiveSheetDescription,
  ResponsiveSheetFooter,
  ResponsiveSheetHeader,
  ResponsiveSheetTitle,
} from "@/components/ui/responsive-sheet";
import { busySlotKindLabels, dayOfWeekLabels } from "@/content/labels";
import { formatDateTr } from "@/lib/format";
import { cn } from "@/lib/utils";
import { deleteBusySlot, deleteScheduleException } from "../server/actions";
import type { BusySlotRow, ScheduleExceptionRow, WeekSchedule } from "../types";
import { BusySlotForm, type BusySlotSheetState } from "./busy-slot-form";
import { ScheduleExceptionForm, type ExceptionSheetState } from "./schedule-exception-form";

const DAYS = [1, 2, 3, 4, 5, 6, 7] as const;

/**
 * Haftalık program düzenleyici (08 §2 Parça 1): saat ızgarası yok, gün başlıklı basit liste;
 * telefonda tek sütun. Meşguliyet ve istisna formları ResponsiveSheet'te. Öğrenci kendi
 * programını, koç öğrencisininkini düzenler (aynı bileşen, yüzey data-surface'ten).
 */
export function ScheduleEditor({
  studentId,
  audience,
  schedule,
}: {
  studentId: string;
  /** "student": sen dili; "coach": nötr. */
  audience: "student" | "coach";
  schedule: WeekSchedule;
}) {
  const [slotSheet, setSlotSheet] = useState<BusySlotSheetState>(null);
  const [exceptionSheet, setExceptionSheet] = useState<ExceptionSheetState>(null);
  const [toDelete, setToDelete] = useState<
    { kind: "slot"; row: BusySlotRow } | { kind: "exception"; row: ScheduleExceptionRow } | null
  >(null);

  const slotsByDay = new Map<number, BusySlotRow[]>();
  for (const s of schedule.slots) {
    slotsByDay.set(s.dayOfWeek, [...(slotsByDay.get(s.dayOfWeek) ?? []), s]);
  }

  return (
    <div className="flex flex-col gap-8">
      <section aria-labelledby="busy-slots-heading" className="flex flex-col gap-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="flex flex-col gap-1">
            <h2 id="busy-slots-heading" className="text-heading font-semibold text-ink-900">
              Sabit meşguliyetler
            </h2>
            <p className="text-small text-ink-500">
              {audience === "student"
                ? "Okul, dershane, kurs gibi her hafta tekrar eden saatlerin. Kalan zamandan planın çıkar."
                : "Her hafta tekrar eden saatler; müsait süre bunlardan hesaplanır."}
            </p>
          </div>
          <Button type="button" onClick={() => setSlotSheet({ mode: "new" })}>
            <PlusIcon aria-hidden="true" />
            Meşguliyet ekle
          </Button>
        </div>

        {schedule.slots.length === 0 ? (
          <p className="rounded-sm border border-line bg-bg-paper p-4 text-small text-ink-700 clay:rounded-card clay:border-0 clay:clay-sm">
            {audience === "student"
              ? "Henüz meşguliyet eklemedin. Okul saatlerinle başla; koçun planı buna göre yapar."
              : "Henüz meşguliyet yok. Okul saatleriyle başlayın; plan oluşturucu müsait süreyi buna göre gösterir."}
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {DAYS.filter((d) => slotsByDay.has(d)).map((day) => (
              <li
                key={day}
                className="rounded-sm border border-line bg-bg-paper clay:rounded-card clay:border-0 clay:clay-sm"
              >
                <h3 className="border-b border-line px-4 py-2 text-small font-semibold text-ink-700 clay:border-0 clay:pb-0">
                  {dayOfWeekLabels[day]}
                </h3>
                <ul className="divide-y divide-line clay:divide-y-0">
                  {(slotsByDay.get(day) ?? []).map((s) => (
                    <li key={s.id} className="flex items-center gap-3 px-4 py-2">
                      <span className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-1">
                        <span className="text-body font-semibold text-ink-900 tabular-nums">
                          {`${s.startsAt} – ${s.endsAt}`}
                        </span>
                        <Badge>{busySlotKindLabels[s.kind]}</Badge>
                        {s.note ? <span className="text-small text-ink-700">{s.note}</span> : null}
                      </span>
                      <RowActions
                        label={`${dayOfWeekLabels[day]} ${s.startsAt} – ${s.endsAt}`}
                        onEdit={() => setSlotSheet({ mode: "edit", row: s })}
                        onDelete={() => setToDelete({ kind: "slot", row: s })}
                      />
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="exceptions-heading" className="flex flex-col gap-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="flex flex-col gap-1">
            <h2 id="exceptions-heading" className="text-heading font-semibold text-ink-900">
              Tek seferlik istisnalar
            </h2>
            <p className="text-small text-ink-500">
              {audience === "student"
                ? "Yazılı, gezi, tüm gün meşgul olduğun günler. Bugünden itibaren olanlar listelenir."
                : "Yazılı, gezi, tüm gün meşguliyet. Bugünden itibaren olanlar listelenir."}
            </p>
          </div>
          <Button
            type="button"
            variant="secondary"
            onClick={() => setExceptionSheet({ mode: "new" })}
          >
            <PlusIcon aria-hidden="true" />
            İstisna ekle
          </Button>
        </div>

        {schedule.exceptions.length === 0 ? (
          <p className="rounded-sm border border-line bg-bg-paper p-4 text-small text-ink-700 clay:rounded-card clay:border-0 clay:clay-sm">
            {audience === "student"
              ? "Yaklaşan bir istisna yok. Yazılı günün belliyse ekle, o gün plana görev düşmesin."
              : "Yaklaşan istisna yok."}
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {schedule.exceptions.map((e) => (
              <li
                key={e.id}
                className="flex items-center gap-3 rounded-sm border border-line bg-bg-paper px-4 py-2 clay:rounded-card clay:border-0 clay:clay-sm"
              >
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="text-body font-semibold text-ink-900">{e.title}</span>
                  <span className="text-small text-ink-500 tabular-nums">
                    {formatDateTr(e.onDate, { weekday: true })}
                    {" · "}
                    {e.startsAt && e.endsAt ? `${e.startsAt} – ${e.endsAt}` : "tüm gün"}
                    {e.note ? ` · ${e.note}` : ""}
                  </span>
                </span>
                <RowActions
                  label={`${e.title}, ${formatDateTr(e.onDate)}`}
                  onEdit={() => setExceptionSheet({ mode: "edit", row: e })}
                  onDelete={() => setToDelete({ kind: "exception", row: e })}
                />
              </li>
            ))}
          </ul>
        )}
      </section>

      <BusySlotForm
        studentId={studentId}
        state={slotSheet}
        onOpenChange={(o) => !o && setSlotSheet(null)}
      />
      <ScheduleExceptionForm
        studentId={studentId}
        state={exceptionSheet}
        onOpenChange={(o) => !o && setExceptionSheet(null)}
      />
      <DeleteSheet
        studentId={studentId}
        target={toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
      />
    </div>
  );
}

function RowActions({
  label,
  onEdit,
  onDelete,
}: {
  label: string;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <span className="flex shrink-0 items-center">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="clay:size-11"
        aria-label={`Düzenle: ${label}`}
        onClick={onEdit}
      >
        <PencilIcon aria-hidden="true" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="clay:size-11"
        aria-label={`Sil: ${label}`}
        onClick={onDelete}
      >
        <Trash2Icon aria-hidden="true" />
      </Button>
    </span>
  );
}

function DeleteSheet({
  studentId,
  target,
  onOpenChange,
}: {
  studentId: string;
  target:
    { kind: "slot"; row: BusySlotRow } | { kind: "exception"; row: ScheduleExceptionRow } | null;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function confirm() {
    if (!target || pending) return;
    startTransition(async () => {
      const result =
        target.kind === "slot"
          ? await deleteBusySlot({ id: target.row.id, studentId })
          : await deleteScheduleException({ id: target.row.id, studentId });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(target.kind === "slot" ? "Meşguliyet silindi." : "İstisna silindi.");
      onOpenChange(false);
      router.refresh();
    });
  }

  const description =
    target?.kind === "slot"
      ? `${dayOfWeekLabels[target.row.dayOfWeek]} ${target.row.startsAt} – ${target.row.endsAt} · ${busySlotKindLabels[target.row.kind]}`
      : target?.kind === "exception"
        ? `${target.row.title} · ${formatDateTr(target.row.onDate)}`
        : "";

  return (
    <ResponsiveSheet open={target !== null} onOpenChange={onOpenChange}>
      <ResponsiveSheetContent className="sm:max-w-md">
        <ResponsiveSheetHeader>
          <span
            aria-hidden="true"
            className={cn(
              "flex size-11 items-center justify-center rounded-md bg-bg-surface text-ink-700",
              "clay:clay-well",
            )}
          >
            {target?.kind === "slot" ? (
              <CalendarClockIcon className="size-5" />
            ) : (
              <CalendarOffIcon className="size-5" />
            )}
          </span>
          <ResponsiveSheetTitle>
            {target?.kind === "slot" ? "Meşguliyeti sil" : "İstisnayı sil"}
          </ResponsiveSheetTitle>
          <ResponsiveSheetDescription>{description}</ResponsiveSheetDescription>
        </ResponsiveSheetHeader>
        <ResponsiveSheetFooter>
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
            Vazgeç
          </Button>
          <Button type="button" onClick={confirm} disabled={pending}>
            {pending ? "Siliniyor…" : "Sil"}
          </Button>
        </ResponsiveSheetFooter>
      </ResponsiveSheetContent>
    </ResponsiveSheet>
  );
}
