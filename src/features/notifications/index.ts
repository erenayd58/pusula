/**
 * `notifications` modülü dışa açık API'si (Faz 8). İstemci bileşenleri bu dosyayı import etmez
 * (sunucu dosyaları da dışa açılır); kabuklar zili, sayfalar gövdeyi buradan alır.
 */
export { notificationsModule } from "./module";
export { NotificationBell } from "./components/notification-bell";
export { NotificationList } from "./components/notification-list";
export { NotificationPrefsForm } from "./components/notification-prefs-form";
export { NotificationsPage } from "./components/notifications-page";
export { notificationText, type NotificationRole, type NotificationText } from "./lib/text";
export { getUnreadCount, listNotifications, getNotificationPrefs } from "./server/queries";
export { markRead, markAllRead, setNotificationPrefs } from "./server/actions";
export {
  markReadSchema,
  setNotificationPrefsSchema,
  notificationPrefsSchema,
  type NotificationPrefs,
  type SetNotificationPrefsInput,
} from "./schemas";
export type { Notification } from "./types";
