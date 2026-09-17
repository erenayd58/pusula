"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { FieldError } from "@/components/shared/field-error";
import { FormError } from "@/components/shared/form-error";
import { NativeSelect } from "@/components/shared/native-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ResponsiveSheet,
  ResponsiveSheetContent,
  ResponsiveSheetDescription,
  ResponsiveSheetFooter,
  ResponsiveSheetHeader,
  ResponsiveSheetTitle,
} from "@/components/ui/responsive-sheet";
import { busySlotKindLabels, dayOfWeekLabels } from "@/content/labels";
import { busySlotKindValues, busySlotSchema, type BusySlotInput } from "../schemas";
import { upsertBusySlot } from "../server/actions";
import type { BusySlotRow } from "../types";

export type BusySlotSheetState = { mode: "new" } | { mode: "edit"; row: BusySlotRow } | null;

const DAYS = [1, 2, 3, 4, 5, 6, 7] as const;

/** Sabit meşguliyet formu: gün, başlangıç/bitiş saati, tür, kısa not. ResponsiveSheet içinde. */
export function BusySlotForm({
  studentId,
  state,
  onOpenChange,
}: {
  studentId: string;
  state: BusySlotSheetState;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <ResponsiveSheet open={state !== null} onOpenChange={onOpenChange}>
      <ResponsiveSheetContent className="sm:max-w-md">
        {state ? (
          // key: her açılışta form o kaydın değerleriyle sıfırdan kurulur.
          <Fields
            key={state.mode === "edit" ? state.row.id : "new"}
            studentId={studentId}
            row={state.mode === "edit" ? state.row : null}
            onOpenChange={onOpenChange}
          />
        ) : null}
      </ResponsiveSheetContent>
    </ResponsiveSheet>
  );
}

function Fields({
  studentId,
  row,
  onOpenChange,
}: {
  studentId: string;
  row: BusySlotRow | null;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string>();
  const form = useForm<BusySlotInput>({
    resolver: zodResolver(busySlotSchema),
    defaultValues: {
      id: row?.id,
      studentId,
      dayOfWeek: row?.dayOfWeek ?? 1,
      startsAt: row?.startsAt ?? "08:30",
      endsAt: row?.endsAt ?? "15:00",
      kind: row?.kind ?? "school",
      note: row?.note ?? "",
    },
  });
  const { errors } = form.formState;

  const onSubmit = form.handleSubmit((values) => {
    setFormError(undefined);
    startTransition(async () => {
      const result = await upsertBusySlot(values);
      if (!result.ok) {
        setFormError(result.error);
        return;
      }
      toast.success(row ? "Meşguliyet güncellendi." : "Meşguliyet eklendi.");
      onOpenChange(false);
      router.refresh();
    });
  });

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
      <ResponsiveSheetHeader>
        <ResponsiveSheetTitle>
          {row ? "Meşguliyeti düzenle" : "Meşguliyet ekle"}
        </ResponsiveSheetTitle>
        <ResponsiveSheetDescription>
          Her hafta aynı gün ve saatte tekrar eden bir zaman dilimi.
        </ResponsiveSheetDescription>
      </ResponsiveSheetHeader>

      <div>
        <Label htmlFor="slot-day">Gün</Label>
        <NativeSelect
          id="slot-day"
          aria-invalid={!!errors.dayOfWeek}
          {...form.register("dayOfWeek", { valueAsNumber: true })}
        >
          {DAYS.map((d) => (
            <option key={d} value={d}>
              {dayOfWeekLabels[d]}
            </option>
          ))}
        </NativeSelect>
        <FieldError message={errors.dayOfWeek?.message} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="slot-start">Başlangıç</Label>
          <Input
            id="slot-start"
            type="time"
            step={300}
            aria-invalid={!!errors.startsAt}
            {...form.register("startsAt")}
          />
          <FieldError message={errors.startsAt?.message} />
        </div>
        <div>
          <Label htmlFor="slot-end">Bitiş</Label>
          <Input
            id="slot-end"
            type="time"
            step={300}
            aria-invalid={!!errors.endsAt}
            {...form.register("endsAt")}
          />
          <FieldError message={errors.endsAt?.message} />
        </div>
      </div>

      <div>
        <Label htmlFor="slot-kind">Tür</Label>
        <NativeSelect id="slot-kind" aria-invalid={!!errors.kind} {...form.register("kind")}>
          {busySlotKindValues.map((k) => (
            <option key={k} value={k}>
              {busySlotKindLabels[k]}
            </option>
          ))}
        </NativeSelect>
        <FieldError message={errors.kind?.message} />
      </div>

      <div>
        <Label htmlFor="slot-note">Not (isteğe bağlı)</Label>
        <Input
          id="slot-note"
          maxLength={120}
          placeholder="ör. Matematik dershanesi"
          aria-invalid={!!errors.note}
          {...form.register("note")}
        />
        <FieldError message={errors.note?.message} />
      </div>

      <FormError message={formError} />

      <ResponsiveSheetFooter>
        <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
          Vazgeç
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? "Kaydediliyor…" : "Kaydet"}
        </Button>
      </ResponsiveSheetFooter>
    </form>
  );
}
