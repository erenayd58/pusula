"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { formatCount } from "@/lib/format";
import type { TopicAlertKind } from "@/types";
import { dismissSuggestion } from "../server/actions";

/** "Şimdi değil": öneriyi `suggestions.dismiss_days` gün gizler (08 §1.6). */
export function DismissSuggestionButton({
  studentId,
  subjectId,
  topicId,
  kind,
  label,
  dismissDays,
}: {
  studentId: string;
  subjectId: string;
  topicId: string | null;
  kind: TopicAlertKind;
  /** Erişilebilir ad için öneri başlığı. */
  label: string;
  dismissDays: number;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function dismiss() {
    startTransition(async () => {
      const result = await dismissSuggestion({ studentId, subjectId, topicId, kind });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(`Öneri ${formatCount(dismissDays, "gün")} gizlendi.`);
      router.refresh();
    });
  }

  return (
    <Button
      type="button"
      variant="ghost"
      onClick={dismiss}
      disabled={pending}
      aria-label={`Şimdi değil: ${label}`}
    >
      Şimdi değil
    </Button>
  );
}
