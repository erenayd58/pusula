"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Trash2Icon } from "lucide-react";
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
import { deleteAnnouncement } from "../server/actions";

/** Duyuru silme (onaylı); gönderilmiş bildirimler kalır. */
export function DeleteAnnouncementButton({ id, title }: { id: string; title: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  function remove() {
    setError(undefined);
    startTransition(async () => {
      const result = await deleteAnnouncement({ id });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      toast.success("Duyuru silindi.");
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <ResponsiveSheet open={open} onOpenChange={setOpen}>
      <ResponsiveSheetTrigger asChild>
        <Button type="button" variant="ghost">
          <Trash2Icon aria-hidden="true" />
          Sil
        </Button>
      </ResponsiveSheetTrigger>
      <ResponsiveSheetContent className="sm:max-w-md">
        <ResponsiveSheetHeader>
          <ResponsiveSheetTitle>Duyuruyu sil</ResponsiveSheetTitle>
          <ResponsiveSheetDescription>
            {`“${title}” listeden silinir; gönderilmiş bildirimler alıcılarda kalır.`}
          </ResponsiveSheetDescription>
        </ResponsiveSheetHeader>
        <FormError message={error} />
        <ResponsiveSheetFooter>
          <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
            Vazgeç
          </Button>
          <Button type="button" onClick={remove} disabled={pending}>
            {pending ? "Siliniyor…" : "Duyuruyu sil"}
          </Button>
        </ResponsiveSheetFooter>
      </ResponsiveSheetContent>
    </ResponsiveSheet>
  );
}
