"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { FieldError } from "@/components/shared/field-error";
import { FormError } from "@/components/shared/form-error";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { setWakeWindowSchema, type SetWakeWindowInput } from "../schemas";
import { setWakeWindow } from "../server/actions";
import type { WakeWindow } from "../types";

/**
 * Uyanık aralık satırı (Faz 5b, karar B10; koç Program sekmesi başlığı): "Uyanık aralık:
 * 08:00 – 22:00 (kurum varsayılanı) · Düzenle" → iki saat alanı; "Kurum varsayılanına dön"
 * ikisini boşaltır. Öğrenci ekranında yalnızca metin (AvailabilitySummary açıklaması).
 */
export function WakeWindowForm({ studentId, wake }: { studentId: string; wake: WakeWindow }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string>();
  const form = useForm<SetWakeWindowInput>({
    resolver: zodResolver(setWakeWindowSchema),
    defaultValues: { studentId, wakeStart: wake.start, wakeEnd: wake.end },
  });
  const { errors } = form.formState;

  function submit(values: SetWakeWindowInput, success: string) {
    setFormError(undefined);
    startTransition(async () => {
      const result = await setWakeWindow(values);
      if (!result.ok) {
        setFormError(result.error);
        return;
      }
      toast.success(success);
      setEditing(false);
      router.refresh();
    });
  }

  const onSubmit = form.handleSubmit((values) => submit(values, "Uyanık aralık kaydedildi."));

  if (!editing) {
    return (
      <p className="flex flex-wrap items-center gap-x-2 text-small text-ink-700">
        <span>
          Uyanık aralık:{" "}
          <span className="font-medium text-ink-900 tabular-nums">{`${wake.start} – ${wake.end}`}</span>
          {wake.isDefault ? " (kurum varsayılanı)" : ""}
        </span>
        <span aria-hidden="true">·</span>
        <button
          type="button"
          className="min-h-11 font-medium text-ink-900 underline underline-offset-4 md:min-h-0"
          onClick={() => setEditing(true)}
        >
          Düzenle
        </button>
      </p>
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-wrap items-end gap-3" noValidate>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="wake-start">Uyanık başlangıç</Label>
        <Input
          id="wake-start"
          type="time"
          className="w-32"
          aria-invalid={!!errors.wakeStart}
          {...form.register("wakeStart", { setValueAs: (v) => (v === "" ? null : v) })}
        />
        <FieldError message={errors.wakeStart?.message} />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="wake-end">Uyanık bitiş</Label>
        <Input
          id="wake-end"
          type="time"
          className="w-32"
          aria-invalid={!!errors.wakeEnd}
          {...form.register("wakeEnd", { setValueAs: (v) => (v === "" ? null : v) })}
        />
        <FieldError message={errors.wakeEnd?.message} />
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Kaydediliyor…" : "Kaydet"}
        </Button>
        <Button
          type="button"
          variant="secondary"
          disabled={pending || wake.isDefault}
          onClick={() =>
            submit(
              { studentId, wakeStart: null, wakeEnd: null },
              "Uyanık aralık kurum varsayılanına döndü.",
            )
          }
        >
          Kurum varsayılanına dön
        </Button>
        <Button type="button" variant="ghost" disabled={pending} onClick={() => setEditing(false)}>
          Vazgeç
        </Button>
      </div>
      {formError ? (
        <div className="basis-full">
          <FormError message={formError} />
        </div>
      ) : null}
    </form>
  );
}
