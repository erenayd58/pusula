/**
 * `announcements` modülü dışa açık API'si (Faz 8). İstemci bileşenleri bu dosyayı import etmez
 * (sunucu dosyaları da dışa açılır).
 */
export { announcementsModule } from "./module";
export { AnnouncementForm, type AnnouncementStudent } from "./components/announcement-form";
export { AnnouncementList } from "./components/announcement-list";
export { listAnnouncements } from "./server/queries";
export { createAnnouncement, deleteAnnouncement } from "./server/actions";
export {
  createAnnouncementSchema,
  deleteAnnouncementSchema,
  announcementRoleValues,
  type CreateAnnouncementInput,
} from "./schemas";
export type { Announcement } from "./types";
