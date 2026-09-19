"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { CopyIcon } from "lucide-react";
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
import { copyTemplateSchema } from "../schemas";
import { copyTemplate } from "../server/actions";

/**
 * "Şablonu kopyala" (owner; Faz 7, karar D7): ad, sezon, "Kaynak ve video kataloglarını da
 * kopyala". Sonuç: yeni şablon seçicide görünür; sınav tarihi ve okul takvimi boş.
 */
export function TemplateCopyForm({
  templateId,
  templateName,
  defaultSeason,
}: {
  templateId: string;
  templateName: string;
  /** Örn. "2027-2028" (mevcut sezonun bir sonrası). */
  defaultSeason: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState("");
  const [season, setSeason] = useState(defaultSeason);
  const [includeCatalogs, setIncludeCatalogs] = useState(true);
  const [errors, setErrors] = useState<{ name?: string; season?: string }>({});
  const [formError, setFormError] = useState<string>();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});
    setFormError(undefined);
    const parsed = copyTemplateSchema.safeParse({ templateId, name, season, includeCatalogs });
    if (!parsed.success) {
      const next: { name?: string; season?: string } = {};
      for (const issue of parsed.error.issues) {
        if (issue.path[0] === "name") next.name = issue.message;
        if (issue.path[0] === "season") next.season = issue.message;
      }
      setErrors(next);
      return;
    }
    startTransition(async () => {
      const result = await copyTemplate(parsed.data);
      if (!result.ok) {
        setFormError(result.error);
        return;
      }
      toast.success("Şablon kopyalandı; sınav tarihi ve okul takvimi boş.");
      setOpen(false);
      router.push(`/coach/templates?template=${result.data.id}`);
      router.refresh();
    });
  }

  return (
    <>
      <Button type="button" variant="secondary" onClick={() => setOpen(true)}>
        <CopyIcon aria-hidden="true" />
        Şablonu kopyala
      </Button>
      <ResponsiveSheet open={open} onOpenChange={setOpen}>
        <ResponsiveSheetContent className="sm:max-w-md">
          <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
            <ResponsiveSheetHeader>
              <ResponsiveSheetTitle>Şablonu kopyala</ResponsiveSheetTitle>
              <ResponsiveSheetDescription>
                {`“${templateName}” dersleri ve konularıyla kurumuna kopyalanır. Sınav tarihi ve okul takvimi boş kalır; Takvim görünümünden yeniden dağıtırsın.`}
              </ResponsiveSheetDescription>
            </ResponsiveSheetHeader>
            <div>
              <Label htmlFor="copy-name">Yeni şablon adı</Label>
              <Input
                id="copy-name"
                maxLength={60}
                placeholder="ör. LGS 2028"
                value={name}
                onChange={(e) => setName(e.target.value)}
                aria-invalid={!!errors.name}
              />
              <FieldError message={errors.name} />
            </div>
            <div>
              <Label htmlFor="copy-season">Sezon</Label>
              <Input
                id="copy-season"
                placeholder="2027-2028"
                value={season}
                onChange={(e) => setSeason(e.target.value)}
                aria-invalid={!!errors.season}
              />
              <FieldError message={errors.season} />
            </div>
            <label className="flex min-h-11 cursor-pointer items-center gap-3 text-small text-ink-900">
              <input
                type="checkbox"
                className="size-4 accent-ink-900"
                checked={includeCatalogs}
                onChange={(e) => setIncludeCatalogs(e.target.checked)}
              />
              Kaynak ve video kataloglarını da kopyala
            </label>
            <FormError message={formError} />
            <ResponsiveSheetFooter>
              <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
                Vazgeç
              </Button>
              <Button type="submit" disabled={pending}>
                {pending ? "Kopyalanıyor…" : "Kopyala"}
              </Button>
            </ResponsiveSheetFooter>
          </form>
        </ResponsiveSheetContent>
      </ResponsiveSheet>
    </>
  );
}
