"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { FormError } from "@/components/shared/form-error";
import { Button } from "@/components/ui/button";
import { setReflection } from "../server/actions";

/** "Haftam nasıl geçti?" — cumartesiden hafta sonuna kadar düzenlenir; kapanınca salt okunur. */
export function ReflectionForm({
  planId,
  initial,
  readOnly,
}: {
  planId: string;
  initial: string | null;
  readOnly: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [value, setValue] = useState(initial ?? "");
  const [error, setError] = useState<string>();
  const dirty = value.trim() !== (initial ?? "").trim();

  function save() {
    setError(undefined);
    startTransition(async () => {
      const result = await setReflection({ planId, text: value });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      toast.success("Değerlendirmen kaydedildi. Koçun okuyacak.");
      router.refresh();
    });
  }

  return (
    <section
      aria-labelledby="reflection-heading"
      className="flex flex-col gap-2 rounded-card clay-md p-4"
    >
      <h2 id="reflection-heading" className="text-heading font-semibold text-ink-900">
        Haftam nasıl geçti?
      </h2>
      <p className="text-small text-ink-500">
        {readOnly ? "Hafta kapandı; yazdıkların koçunda." : "Koçun okur. İki satır yeter."}
      </p>
      {readOnly ? (
        <p className="text-body text-ink-900">
          {initial ? `“${initial}”` : "Bu hafta bir şey yazmadın."}
        </p>
      ) : (
        <>
          <label htmlFor="reflection" className="sr-only">
            Haftam nasıl geçti?
          </label>
          <textarea
            id="reflection"
            rows={3}
            maxLength={1000}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Bu hafta ne iyi gitti, nerede zorlandın?"
            className="w-full rounded-md clay-well px-4 py-3 text-body text-ink-900 placeholder:text-ink-300"
          />
          <FormError message={error} />
          <div>
            <Button type="button" onClick={save} disabled={pending || !dirty}>
              {pending ? "Kaydediliyor…" : "Kaydet"}
            </Button>
          </div>
        </>
      )}
    </section>
  );
}
