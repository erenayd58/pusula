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
import { setGoalsSchema, type SetGoalsInput } from "../schemas";
import { setGoals } from "../server/actions";

/**
 * Koç hedef formu (flat): günlük ve haftalık soru hedefi. Boş alan = o dönem için hedef yok.
 * Aynı zod şeması eylemde de kullanılır.
 */
export function GoalForm({
  studentId,
  initial,
}: {
  studentId: string;
  initial: { daily: number | null; weekly: number | null };
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string>();
  const form = useForm<SetGoalsInput>({
    resolver: zodResolver(setGoalsSchema),
    defaultValues: { studentId, daily: initial.daily, weekly: initial.weekly },
  });
  const { errors } = form.formState;
  // Boş alan null'a çevrilir (valueAsNumber boşta NaN verir).
  const asNullableInt = (v: string) => (v.trim() === "" ? null : Number(v));

  const onSubmit = form.handleSubmit((values) => {
    setFormError(undefined);
    startTransition(async () => {
      const result = await setGoals(values);
      if (!result.ok) {
        setFormError(result.error);
        return;
      }
      toast.success("Hedefler kaydedildi.");
      router.refresh();
    });
  });

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="goal-daily">Günlük soru hedefi</Label>
          <Input
            id="goal-daily"
            type="number"
            inputMode="numeric"
            min={1}
            placeholder="ör. 60"
            aria-invalid={!!errors.daily}
            {...form.register("daily", { setValueAs: asNullableInt })}
          />
          <FieldError message={errors.daily?.message} />
        </div>
        <div>
          <Label htmlFor="goal-weekly">Haftalık soru hedefi</Label>
          <Input
            id="goal-weekly"
            type="number"
            inputMode="numeric"
            min={1}
            placeholder="ör. 300"
            aria-invalid={!!errors.weekly}
            {...form.register("weekly", { setValueAs: asNullableInt })}
          />
          <FieldError message={errors.weekly?.message} />
        </div>
      </div>
      <p className="text-micro-lg text-ink-500">
        Boş bırakılan dönem için hedef gösterilmez. Hafta pazartesi başlar.
      </p>
      <FormError message={formError} />
      <div>
        <Button type="submit" disabled={pending}>
          {pending ? "Kaydediliyor…" : "Hedefleri kaydet"}
        </Button>
      </div>
    </form>
  );
}
