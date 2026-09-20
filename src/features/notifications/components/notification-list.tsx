import type { LucideIcon } from "lucide-react";
import {
  BellIcon,
  CalendarCheckIcon,
  ChartColumnIcon,
  ClipboardListIcon,
  ClockIcon,
  MegaphoneIcon,
  MessageSquareTextIcon,
  RefreshCwIcon,
  StickyNoteIcon,
} from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { formatDateTr, formatTimeTr } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { NotificationType } from "@/types";
import { notificationText, type NotificationRole } from "../lib/text";
import type { Notification } from "../types";
import { NotificationLink } from "./notification-link";

const ICON: Record<NotificationType, LucideIcon> = {
  plan_published: CalendarCheckIcon,
  note_added: StickyNoteIcon,
  announcement: MegaphoneIcon,
  mock_result_added: ClipboardListIcon,
  student_note: MessageSquareTextIcon,
  review_due: RefreshCwIcon,
  student_inactive: ClockIcon,
  weekly_summary: ChartColumnIcon,
};

/**
 * Bildirim listesi (12 §2 Adım 5): türe göre ikon, başlık, gövde, tarih·saat; okunmamış satır
 * kalın + nokta + sr-only "okunmadı"; satır bağlantı (tıklamada okundu). Metin `notificationText`.
 */
export function NotificationList({
  notifications,
  role,
}: {
  notifications: Notification[];
  role: NotificationRole;
}) {
  if (notifications.length === 0) {
    return (
      <EmptyState
        icon={BellIcon}
        title="Henüz bildirim yok"
        description="Plan, not, duyuru ve haftalık özet burada birikir."
      />
    );
  }
  return (
    <ul className="flex flex-col gap-2" aria-label="Bildirimler" data-testid="notification-list">
      {notifications.map((n) => {
        const text = notificationText({
          type: n.type,
          data: n.data,
          role,
          studentId: n.studentId,
          studentName: n.studentName,
        });
        const unread = n.readAt === null;
        const Icon = ICON[n.type];
        return (
          <li key={n.id} data-testid="notification-item" data-unread={unread}>
            <NotificationLink
              id={n.id}
              href={text.href}
              unread={unread}
              className={cn(
                "flex items-start gap-3 rounded-sm border border-line bg-bg-paper px-4 py-3",
                "clay:clay-press clay:rounded-card clay:border-0 clay:clay-sm clay:bg-bg-raised",
                unread && "border-line-strong",
              )}
            >
              <span
                aria-hidden="true"
                className="flex size-9 shrink-0 items-center justify-center rounded-sm bg-bg-surface text-ink-700 clay:clay-well"
              >
                <Icon className="size-4" />
              </span>
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span
                  className={cn(
                    "text-small text-ink-900",
                    unread ? "font-semibold" : "font-medium",
                  )}
                >
                  {text.title}
                  {unread ? <span className="sr-only"> (okunmadı)</span> : null}
                </span>
                {text.body ? (
                  <span className="line-clamp-3 text-small text-ink-700">{text.body}</span>
                ) : null}
                <span className="text-micro-lg text-ink-500">
                  {formatDateTr(n.createdAt)} · {formatTimeTr(n.createdAt)}
                </span>
              </span>
              {unread ? (
                <span aria-hidden="true" className="mt-2 size-2 shrink-0 rounded-pill bg-ink-900" />
              ) : null}
            </NotificationLink>
          </li>
        );
      })}
    </ul>
  );
}
