"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { consentDocument } from "@/content/consent";
import { giveConsent } from "../server/consent-actions";
import { FormError } from "./form-error";

/** Aydınlatma metni + tek onay kutusu; listedeki her çocuk için iki onay satırı yazılır. */
export function ConsentForm({ students }: { students: { studentId: string; fullName: string }[] }) {
  const router = useRouter();
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(undefined);
    if (!accepted) {
      setError("Devam etmek için onay kutusunu işaretleyin.");
      return;
    }
    startTransition(async () => {
      const result = await giveConsent({
        studentIds: students.map((c) => c.studentId),
        accepted: true,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.push("/parent");
      router.refresh();
    });
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-6" noValidate>
      <p className="inline-flex w-fit rounded-pill bg-warning-soft px-3 py-1 text-micro-lg font-medium text-ink-900">
        {consentDocument.draftLabel}
      </p>

      <article className="flex flex-col gap-4 text-small text-ink-700">
        <h2 className="text-heading font-semibold text-ink-900">{consentDocument.title}</h2>
        {consentDocument.sections.map((section) => (
          <section key={section.heading} className="flex flex-col gap-1">
            <h3 className="font-medium text-ink-900">{section.heading}</h3>
            <p>{section.body}</p>
          </section>
        ))}
        <p className="text-micro-lg text-ink-500">Belge sürümü: {consentDocument.version}</p>
      </article>

      <div className="rounded-md bg-bg-sunken p-4 text-small">
        <p className="mb-3 text-ink-700">
          Onay verilecek öğrenci{students.length > 1 ? "ler" : ""}:{" "}
          <span className="font-medium text-ink-900">
            {students.map((c) => c.fullName).join(", ")}
          </span>
        </p>
        <label className="flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            name="accepted"
            checked={accepted}
            onChange={(e) => setAccepted(e.target.checked)}
            className="mt-1 size-5 shrink-0 accent-ink-900"
          />
          <span className="text-ink-900">{consentDocument.explicitConsentStatement}</span>
        </label>
      </div>

      <FormError message={error} />

      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Kaydediliyor…" : "Onaylıyorum"}
      </Button>
    </form>
  );
}
