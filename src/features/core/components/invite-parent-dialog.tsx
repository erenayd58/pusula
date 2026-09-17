"use client";

import { useState, useTransition } from "react";
import { CopyIcon, MailPlusIcon } from "lucide-react";
import { toast } from "sonner";
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
import { formatDateTr } from "@/lib/format";
import { createParentInvitation } from "../server/invitation-actions";
import { FormError } from "./form-error";

/** Koç, öğrencisi için 7 gün geçerli tek kullanımlık veli davet kodu üretir ve linki paylaşır. */
export function InviteParentDialog({
  student,
}: {
  student: { profileId: string; fullName: string };
}) {
  const [open, setOpen] = useState(false);
  const [invitation, setInvitation] = useState<{ code: string; expiresAt: string }>();
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  function generate() {
    setError(undefined);
    startTransition(async () => {
      const result = await createParentInvitation({ studentId: student.profileId });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setInvitation(result.data);
    });
  }

  const link = invitation ? `${window.location.origin}/invite/${invitation.code}` : "";

  async function copy(text: string, label: string) {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} kopyalandı.`);
    } catch {
      toast.error("Kopyalanamadı; metni elle seçip kopyala.");
    }
  }

  return (
    <ResponsiveSheet
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setInvitation(undefined);
      }}
    >
      <ResponsiveSheetTrigger asChild>
        <Button variant="secondary">
          <MailPlusIcon aria-hidden="true" />
          Veli daveti
        </Button>
      </ResponsiveSheetTrigger>
      <ResponsiveSheetContent>
        <ResponsiveSheetHeader>
          <ResponsiveSheetTitle>Veli daveti</ResponsiveSheetTitle>
          <ResponsiveSheetDescription>
            {student.fullName} için davet kodu üret; veli kodu ya da bağlantıyı kullanarak kendi
            e-postasıyla kayıt olur. Kod 7 gün geçerli, tek kullanımlıktır.
          </ResponsiveSheetDescription>
        </ResponsiveSheetHeader>

        {invitation ? (
          <dl className="flex flex-col gap-3 text-small">
            <div>
              <dt className="text-micro-lg text-ink-500">Davet kodu</dt>
              <dd className="flex items-center gap-2">
                <code className="text-heading font-semibold tracking-widest">
                  {invitation.code}
                </code>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label="Kodu kopyala"
                  onClick={() => copy(invitation.code, "Kod")}
                >
                  <CopyIcon aria-hidden="true" />
                </Button>
              </dd>
            </div>
            <div>
              <dt className="text-micro-lg text-ink-500">Kayıt bağlantısı</dt>
              <dd className="flex items-center gap-2">
                <span className="break-all">{link}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label="Bağlantıyı kopyala"
                  onClick={() => copy(link, "Bağlantı")}
                >
                  <CopyIcon aria-hidden="true" />
                </Button>
              </dd>
            </div>
            <div>
              <dt className="text-micro-lg text-ink-500">Son geçerlilik</dt>
              <dd>{formatDateTr(invitation.expiresAt)}</dd>
            </div>
          </dl>
        ) : null}

        <FormError message={error} />

        <ResponsiveSheetFooter>
          <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
            Kapat
          </Button>
          <Button type="button" onClick={generate} disabled={pending}>
            {pending ? "Üretiliyor…" : invitation ? "Yeni kod üret" : "Davet kodu üret"}
          </Button>
        </ResponsiveSheetFooter>
      </ResponsiveSheetContent>
    </ResponsiveSheet>
  );
}
