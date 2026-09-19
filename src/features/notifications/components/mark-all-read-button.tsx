"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { CheckCheckIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { markAllRead } from "../server/actions";

export function MarkAllReadButton({ disabled }: { disabled?: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <Button
      type="button"
      variant="secondary"
      disabled={disabled || pending}
      onClick={() =>
        startTransition(async () => {
          const result = await markAllRead({});
          if (!result.ok) {
            toast.error(result.error);
            return;
          }
          router.refresh();
        })
      }
    >
      <CheckCheckIcon aria-hidden="true" />
      {pending ? "İşaretleniyor…" : "Tümünü okundu işaretle"}
    </Button>
  );
}
