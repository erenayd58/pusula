import Link from "next/link";
import { BellIcon } from "lucide-react";
import { formatCount } from "@/lib/format";
import { cn } from "@/lib/utils";
import { getUnreadCount } from "../server/queries";

/**
 * Zil (12 §2 Adım 5): okunmamış sayısı rozetle (`ink-900` üstüne `bg-raised`; uyarı rengi yok),
 * 0 ise rozet yok. 44 px dokunma hedefi; `aria-label` sayıyı söyler. Bağlantı rolün liste sayfası.
 */
export async function NotificationBell({
  href,
  className,
}: {
  href: "/student/notifications" | "/coach/notifications" | "/parent/notifications";
  className?: string;
}) {
  const unread = await getUnreadCount();
  const label = unread > 0 ? `Bildirimler: ${formatCount(unread, "okunmamış")}` : "Bildirimler";
  return (
    <Link
      href={href}
      aria-label={label}
      data-testid="notification-bell"
      data-unread={unread}
      className={cn(
        "relative flex size-11 shrink-0 items-center justify-center rounded-md text-ink-700 hover:bg-bg-surface",
        "clay:clay-press clay:clay-sm clay:bg-bg-raised clay:text-ink-900",
        className,
      )}
    >
      <BellIcon aria-hidden="true" className="size-5" />
      {unread > 0 ? (
        <span
          aria-hidden="true"
          className="absolute -top-0.5 -right-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-pill bg-ink-900 px-1 text-[11px] leading-none font-semibold text-bg-paper tabular-nums"
        >
          {unread > 99 ? "99+" : unread}
        </span>
      ) : null}
    </Link>
  );
}
