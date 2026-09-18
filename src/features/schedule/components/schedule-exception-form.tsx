"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { FieldError } from "@/components/shared/field-error";
import { FormError } from "@/components/shared/form-error";
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
import { Switch } from "@/components/ui/switch";
import { toDateKey, todayInIstanbul } from "@/lib/dates";
import { scheduleExceptionSchema, type ScheduleExceptionInput } from "../schemas";
import { upsertScheduleException } from "../server/actions";
import type { ScheduleExceptionRow } from "../types";

export type ExceptionSheetState =
  { mode: "new" } | { mode: "edit"; row: ScheduleExceptionRow } | null;

/** Tek seferlik istisna formu: tarih, tüm gün anahtarı, saat aralığı, başlık, not. */
export function ScheduleExceptionForm({
  studentId,
  state,
  onOpenChange,
}: {
  studentId: string;
  state: ExceptionSheetState;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <ResponsiveSheet open={state !== null} onOpenChange={onOpenChange}>
      <ResponsiveSheetContent className="sm:max-w-md">
        {state ? (
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
  row: ScheduleExceptionRow | null;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string>();
  const form = useForm<ScheduleExceptionInput>({
    resolver: zodResolver(scheduleExceptionSchema),
    defaultValues: {
      id: row?.id,
      studentId,
      onDate: row?.onDate ?? toDateKey(todayInIstanbul()),
      allDay: row ? row.startsAt === null : true,
      startsAt: row?.startsAt ?? "13:00",
      endsAt: row?.endsAt ?? "15:00",
      title: row?.title ?? "",
      note: row?.note ?? "",
    },
  });
  const { errors } = form.formState;
  const allDay = useWatch({ control: form.control, name: "allDay" });

  const onSubmit = form.handleSubmit((values) => {
    setFormError(undefined);
    startTransition(async () => {
      const result = await upsertScheduleException(values);
      if (!result.ok) {
        setFormError(result.error);
        return;
      }
      toast.success(row ? "İstisna güncellendi." : "İstisna eklendi.");
      onOpenChange(false);
      router.refresh();
    });
  });

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
      <ResponsiveSheetHeader>
        <ResponsiveSheetTitle>{row ? "İstisnayı düzenle" : "İstisna ekle"}</ResponsiveSheetTitle>
        <ResponsiveSheetDescription>
          Belirli bir güne özel: yazılı, gezi ya da tüm gün meşguliyet.
        </ResponsiveSheetDescription>
      </ResponsiveSheetHeader>

      <div>
        <Label htmlFor="exc-title">Başlık</Label>
        <Input
          id="exc-title"
          maxLength={80}
          placeholder="ör. Yazılı: Fen"
          aria-invalid={!!errors.title}
          {...form.register("title")}
        />
        <FieldError message={errors.title?.message} />
      </div>

      <div>
        <Label htmlFor="exc-date">Tarih</Label>
        <Input
          id="exc-date"
          type="date"
          aria-invalid={!!errors.onDate}
          {...form.register("onDate")}
        />
        <FieldError message={errors.onDate?.message} />
      </div>

      <div className="flex items-center justify-between gap-3 rounded-sm border border-line bg-bg-paper px-3 py-2 clay:rounded-md clay:border-0 clay:clay-well">
        <Label htmlFor="exc-all-day" className="mb-0">
          Tüm gün
        </Label>
        <Controller
          control={form.control}
          name="allDay"
          render={({ field }) => (
            <Switch
              id="exc-all-day"
              checked={field.value}
              onCheckedChange={field.onChange}
              onBlur={field.onBlur}
            />
          )}
        />
      </div>

      {!allDay ? (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="exc-start">Başlangıç</Label>
            <Input
              id="exc-start"
              type="time"
              step={300}
              aria-invalid={!!errors.startsAt}
              {...form.register("startsAt")}
            />
            <FieldError message={errors.startsAt?.message} />
          </div>
          <div>
            <Label htmlFor="exc-end">Bitiş</Label>
            <Input
              id="exc-end"
              type="time"
              step={300}
              aria-invalid={!!errors.endsAt}
              {...form.register("endsAt")}
            />
            <FieldError message={errors.endsAt?.message} />
          </div>
        </div>
      ) : null}

      <div>
        <Label htmlFor="exc-note">Not (isteğe bağlı)</Label>
        <Input
          id="exc-note"
          maxLength={120}
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
