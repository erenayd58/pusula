"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FileCheckIcon } from "lucide-react";
import { toast } from "sonner";
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
  ResponsiveSheetTrigger,
} from "@/components/ui/responsive-sheet";
import { CONSENT_DOCUMENT_VERSION } from "@/config/constants";
import { toDateKey } from "@/lib/dates";
import { recordPaperConsent } from "../server/consent-actions";
import { FieldError } from "./field-error";
import { FormError } from "./form-error";

/**
 * Koç, kâğıt üzerinde alınan veli onayını işler: tarih (varsayılan bugün) ve belge sürümü
 * (varsayılan yürürlükteki metin). Kayıt `recorded_by` ile koça bağlanır.
 */
export function PaperConsentDialog({
  student,
}: {
  student: { profileId: string; fullName: string };
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string>();
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [pending, startTransition] = useTransition();

  function submit(formData: FormData) {
    setError(undefined);
    setFieldErrors({});
    startTransition(async () => {
      const result = await recordPaperConsent({
        studentId: student.profileId,
        givenAt: formData.get("givenAt"),
        documentVersion: formData.get("documentVersion"),
      });
      if (!result.ok) {
        setError(result.error);
        setFieldErrors(result.fieldErrors ?? {});
        return;
      }
      toast.success("Kâğıt onayı kaydedildi.");
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <ResponsiveSheet open={open} onOpenChange={setOpen}>
      <ResponsiveSheetTrigger asChild>
        <Button variant="secondary">
          <FileCheckIcon aria-hidden="true" />
          Kâğıt onayı kaydet
        </Button>
      </ResponsiveSheetTrigger>
      <ResponsiveSheetContent>
        <ResponsiveSheetHeader>
          <ResponsiveSheetTitle>Kâğıt onayı kaydet</ResponsiveSheetTitle>
          <ResponsiveSheetDescription>
            {student.fullName} için veliden kâğıt üzerinde alınan aydınlatma metni ve açık rıza
            onayını sisteme işler. Kayıt sizin adınıza tutulur; imzalı belgeyi saklayın.
          </ResponsiveSheetDescription>
        </ResponsiveSheetHeader>
        <form action={submit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="paper-consent-date">Onay tarihi</Label>
            <Input
              id="paper-consent-date"
              name="givenAt"
              type="date"
              required
              defaultValue={toDateKey(new Date())}
              max={toDateKey(new Date())}
              aria-invalid={fieldErrors.givenAt ? true : undefined}
            />
            <FieldError message={fieldErrors.givenAt?.[0]} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="paper-consent-version">Belge sürümü</Label>
            <Input
              id="paper-consent-version"
              name="documentVersion"
              required
              defaultValue={CONSENT_DOCUMENT_VERSION}
              aria-invalid={fieldErrors.documentVersion ? true : undefined}
            />
            <FieldError message={fieldErrors.documentVersion?.[0]} />
          </div>
          <FormError message={error} />
          <ResponsiveSheetFooter>
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
              Vazgeç
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Kaydediliyor…" : "Onayı kaydet"}
            </Button>
          </ResponsiveSheetFooter>
        </form>
      </ResponsiveSheetContent>
    </ResponsiveSheet>
  );
}
