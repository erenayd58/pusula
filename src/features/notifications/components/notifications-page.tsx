import type { NotificationRole } from "../lib/text";
import { getNotificationPrefs, listNotifications } from "../server/queries";
import { MarkAllReadButton } from "./mark-all-read-button";
import { NotificationList } from "./notification-list";
import { NotificationPrefsForm } from "./notification-prefs-form";

/** Tercih açıklaması: öğrenci "sen", veli "siz", koç nötr (04 §12). */
const PREFS_HINT: Record<NotificationRole, string> = {
  student: "Kapattığın tür bir daha gelmez; istediğinde yeniden açarsın.",
  parent: "Kapattığınız tür bir daha gelmez; istediğinizde yeniden açabilirsiniz.",
  coach: "Kapatılan tür gelmez; istendiğinde yeniden açılır.",
};

/**
 * Üç rolün ortak bildirim sayfası gövdesi: başlık + "Tümünü okundu işaretle", liste, altta
 * tercihler. Rol metni ve bağlantıları belirler (öğrenci "sen", veli "siz", koç nötr).
 */
export async function NotificationsPage({ role }: { role: NotificationRole }) {
  const [notifications, prefs] = await Promise.all([listNotifications(), getNotificationPrefs()]);
  const unread = notifications.filter((n) => n.readAt === null).length;

  return (
    <>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-title font-semibold tracking-tight lg:text-title-lg">Bildirimler</h1>
          <p className="text-small text-ink-500">
            {unread > 0 ? `${unread} okunmamış bildirim` : "Hepsi okundu"}
          </p>
        </div>
        <MarkAllReadButton disabled={unread === 0} />
      </header>
      <NotificationList notifications={notifications} role={role} />
      <section aria-labelledby="prefs-heading" className="flex flex-col gap-3">
        <h2 id="prefs-heading" className="text-heading font-semibold text-ink-900">
          Bildirim tercihleri
        </h2>
        <p className="text-small text-ink-500">{PREFS_HINT[role]}</p>
        <NotificationPrefsForm role={role} prefs={prefs} />
      </section>
    </>
  );
}
