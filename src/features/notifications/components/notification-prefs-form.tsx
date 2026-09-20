"use client";

import { useRouter } from "next/navigation";
import { useOptimistic, useTransition } from "react";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { notificationTypeLabels } from "@/content/labels";
import type { NotificationType } from "@/types";
import type { NotificationRole } from "../lib/text";
import type { NotificationPrefs } from "../schemas";
import { setNotificationPrefs } from "../server/actions";

/** Rolün alabildiği türler (tercih formunda yalnızca bunlar). */
export const ROLE_TYPES: Record<NotificationRole, readonly NotificationType[]> = {
  student: ["plan_published", "note_added", "announcement", "review_due", "weekly_summary"],
  parent: ["note_added", "announcement", "weekly_summary"],
  coach: ["mock_result_added", "student_note", "student_inactive", "weekly_summary"],
};

/**
 * Bildirim tercihleri (12 §2 Adım 5): tür başına aç/kapat, anında kaydeder. Anahtar yoksa açık;
 * yalnızca kapalı türler `profiles.notification_prefs`'e yazılır.
 */
export function NotificationPrefsForm({
  role,
  prefs,
}: {
  role: NotificationRole;
  prefs: NotificationPrefs;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [optimistic, setOptimistic] = useOptimistic(
    prefs,
    (state, next: { type: NotificationType; on: boolean }) => ({ ...state, [next.type]: next.on }),
  );

  function toggle(type: NotificationType, on: boolean) {
    startTransition(async () => {
      setOptimistic({ type, on });
      const result = await setNotificationPrefs({ prefs: { ...optimistic, [type]: on } });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <ul
      className="divide-y divide-line rounded-sm border border-line bg-bg-paper clay:rounded-card clay:border-0 clay:clay-sm clay:bg-bg-raised"
      data-testid="notification-prefs"
    >
      {ROLE_TYPES[role].map((type) => {
        const id = `pref-${type}`;
        const on = optimistic[type] !== false;
        return (
          <li key={type} className="flex items-center justify-between gap-4 px-4 py-2">
            <Label htmlFor={id} className="text-body text-ink-900">
              {notificationTypeLabels[type]}
            </Label>
            <div className="flex shrink-0 items-center p-2">
              <Switch
                id={id}
                checked={on}
                disabled={pending}
                onCheckedChange={(next) => toggle(type, next)}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
