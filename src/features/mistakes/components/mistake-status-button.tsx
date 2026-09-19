"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { CheckIcon, Trash2Icon, Undo2Icon } from "lucide-react";
import { toast } from "sonner";
import { FormError } from "@/components/shared/form-error";
import { Button } from "@/components/ui/button";
import {
  ResponsiveSheet,
  ResponsiveSheetContent,
  ResponsiveSheetDescription,
  ResponsiveSheetFooter,
  ResponsiveSheetHeader,
  ResponsiveSheetTitle,
  ResponsiveSheetTrigger,
} from "@/components/ui/responsive-sheet";
import { deleteMistake, setMistakeStatus } from "../server/actions";

/** "Çözdüm" / "Geri al" (öğrenci ve koç). Çözülen kart fosforlu onayla işaretlenir (04 §5). */
export function MistakeStatusButton({
  mistakeId,
  studentId,
  solved,
  compact,
}: {
  mistakeId: string;
  studentId: string;
  solved: boolean;
  compact?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function toggle() {
    startTransition(async () => {
      const result = await setMistakeStatus({ id: mistakeId, studentId, solved: !solved });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(solved ? "Kayıt yeniden açıldı." : "Çözdün, harika!");
      router.refresh();
    });
  }

  return (
    <Button
      type="button"
      variant={solved ? "ghost" : "secondary"}
      onClick={toggle}
      disabled={pending}
      aria-pressed={solved}
      className={compact ? "min-h-9" : undefined}
    >
      {solved ? <Undo2Icon aria-hidden="true" /> : <CheckIcon aria-hidden="true" />}
      {solved ? "Geri al" : "Çözdüm"}
    </Button>
  );
}

/** Kayıt silme (onaylı alt panel / diyalog); silince listeye döner. */
export function MistakeDeleteButton({
  mistakeId,
  studentId,
  basePath,
}: {
  mistakeId: string;
  studentId: string;
  basePath: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  function remove() {
    setError(undefined);
    startTransition(async () => {
      const result = await deleteMistake({ id: mistakeId, studentId });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      toast.success("Kayıt silindi.");
      setOpen(false);
      router.push(basePath);
      router.refresh();
    });
  }

  return (
    <ResponsiveSheet open={open} onOpenChange={setOpen}>
      <ResponsiveSheetTrigger asChild>
        <Button variant="secondary">
          <Trash2Icon aria-hidden="true" />
          Sil
        </Button>
      </ResponsiveSheetTrigger>
      <ResponsiveSheetContent className="sm:max-w-md">
        <ResponsiveSheetHeader>
          <ResponsiveSheetTitle>Kaydı sil</ResponsiveSheetTitle>
          <ResponsiveSheetDescription>
            Kayıt ve fotoğrafı silinir; geri alınamaz.
          </ResponsiveSheetDescription>
        </ResponsiveSheetHeader>
        <FormError message={error} />
        <ResponsiveSheetFooter>
          <Button
            type="button"
            variant="secondary"
            onClick={() => setOpen(false)}
            disabled={pending}
          >
            Vazgeç
          </Button>
          <Button type="button" onClick={remove} disabled={pending}>
            {pending ? "Siliniyor…" : "Kaydı sil"}
          </Button>
        </ResponsiveSheetFooter>
      </ResponsiveSheetContent>
    </ResponsiveSheet>
  );
}
