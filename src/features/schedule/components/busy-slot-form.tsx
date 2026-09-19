"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { DayChips, WEEKDAYS } from "@/components/shared/day-chips";
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
import { busySlotKindLabels } from "@/content/labels";
import { busySlotFormSchema, busySlotKindValues, type BusySlotFormInput } from "../schemas";
import { addBusySlots, upsertBusySlot } from "../server/actions";
import type { BusySlotRow } from "../types";

export type BusySlotSheetState = { mode: "new" } | { mode: "edit"; row: BusySlotRow } | null;

/**
 * Sabit meşguliyet formu: gün(ler), başlangıç/bitiş saati, tür, kısa not. ResponsiveSheet içinde.
 * Eklemede gün çipleri çoklu seçim ("Hafta içi" kısayolu; okul için varsayılan Pzt–Cum) ve her
 * gün ayrı satır olur; düzenlemede tek gün.
 */
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
  const form = useForm<BusySlotFormInput>({
    resolver: zodResolver(busySlotFormSchema),
    defaultValues: {
      id: row?.id,
      studentId,
      days: row ? [row.dayOfWeek] : [...WEEKDAYS],
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
      const { id, days, ...rest } = values;
      // Düzenlemede çipler tekil (radyo); şema en az bir gün ister.
      const result = id
        ? await upsertBusySlot({ ...rest, id, dayOfWeek: days[0]! })
        : await addBusySlots({ ...rest, days });
      if (!result.ok) {
        setFormError(result.error);
        return;
      }
      toast.success(
        id
          ? "Meşguliyet güncellendi."
          : days.length > 1
            ? `Meşguliyet ${days.length} güne eklendi.`
            : "Meşguliyet eklendi.",
      );
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
          {row
            ? "Her hafta aynı gün ve saatte tekrar eden bir zaman dilimi."
            : "Her hafta aynı saatte tekrar eder. Birden fazla gün seçilirse her güne ayrı kayıt eklenir."}
        </ResponsiveSheetDescription>
      </ResponsiveSheetHeader>

      <Controller
        control={form.control}
        name="days"
        render={({ field }) => (
          <DayChips
            label={row ? "Gün" : "Günler"}
            single={row !== null}
            value={field.value}
            onChange={(days) => field.onChange(days.filter((d): d is number => d !== null))}
            error={errors.days?.message}
          />
        )}
      />

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
