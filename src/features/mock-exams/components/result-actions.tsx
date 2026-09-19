"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { PencilIcon, Trash2Icon } from "lucide-react";
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
import { deleteMockResult } from "../server/actions";

/** Detay sayfası eylemleri: düzenle (`?edit=1` sihirbazı dolu açar) ve sil (onaylı). */
export function ResultActions({
  resultId,
  studentId,
  title,
  basePath,
}: {
  resultId: string;
  studentId: string;
  title: string;
  basePath: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  function remove() {
    setError(undefined);
    startTransition(async () => {
      const result = await deleteMockResult({ id: resultId, studentId });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      toast.success("Deneme silindi.");
      setOpen(false);
      router.push(basePath);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Button asChild variant="secondary">
        <Link href={`${basePath}/${resultId}?edit=1`}>
          <PencilIcon aria-hidden="true" />
          Düzenle
        </Link>
      </Button>
      <ResponsiveSheet open={open} onOpenChange={setOpen}>
        <ResponsiveSheetTrigger asChild>
          <Button variant="secondary">
            <Trash2Icon aria-hidden="true" />
            Sil
          </Button>
        </ResponsiveSheetTrigger>
        <ResponsiveSheetContent className="sm:max-w-md">
          <ResponsiveSheetHeader>
            <ResponsiveSheetTitle>Denemeyi sil</ResponsiveSheetTitle>
            <ResponsiveSheetDescription>
              {`“${title}” sonucu, ders netleri ve konu işaretleriyle birlikte silinir. Geri alınamaz.`}
            </ResponsiveSheetDescription>
          </ResponsiveSheetHeader>
          <FormError message={error} />
          <ResponsiveSheetFooter>
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
              Vazgeç
            </Button>
            <Button type="button" onClick={remove} disabled={pending}>
              {pending ? "Siliniyor…" : "Denemeyi sil"}
            </Button>
          </ResponsiveSheetFooter>
        </ResponsiveSheetContent>
      </ResponsiveSheet>
    </div>
  );
}
