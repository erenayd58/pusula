"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { FormError } from "@/components/shared/form-error";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { setCoachMessage } from "../server/actions";

/** Koçun haftalık mesajı (öğrenci plan ekranında kart olarak görünür). */
export function CoachMessageForm({
  planId,
  studentId,
  initial,
  disabled,
}: {
  planId: string | null;
  studentId: string;
  initial: string | null;
  disabled?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [value, setValue] = useState(initial ?? "");
  const [error, setError] = useState<string>();
  const dirty = value.trim() !== (initial ?? "").trim();

  function save() {
    if (!planId) return;
    setError(undefined);
    startTransition(async () => {
      const result = await setCoachMessage({ planId, studentId, message: value });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      toast.success("Haftalık mesaj kaydedildi.");
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor="coach-message">Haftalık mesaj (öğrenci görür)</Label>
      <textarea
        id="coach-message"
        rows={2}
        maxLength={500}
        value={value}
        disabled={disabled || !planId}
        placeholder="ör. Bu hafta paragrafa ağırlık veriyoruz. Her gün 30 soru yeterli, acele etme."
        onChange={(e) => setValue(e.target.value)}
        className={cn(
          "w-full rounded-xs border border-line-strong bg-bg-paper px-3 py-2 text-small text-ink-900 placeholder:text-ink-300",
          "disabled:cursor-not-allowed disabled:bg-bg-surface disabled:text-ink-300",
        )}
      />
      <FormError message={error} />
      <div>
        <Button
          type="button"
          variant="secondary"
          onClick={save}
          disabled={pending || !dirty || !planId || disabled}
        >
          {pending ? "Kaydediliyor…" : "Mesajı kaydet"}
        </Button>
      </div>
    </div>
  );
}
