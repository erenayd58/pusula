/** Duyuru satırı (koç listesi; öğrenci/veli tabloyu okumaz — bildirimden okur, karar E3). */
export type Announcement = {
  id: string;
  title: string;
  body: string;
  roles: ("student" | "parent")[];
  /** null = tüm öğrenciler. */
  studentIds: string[] | null;
  authorName: string | null;
  createdAt: string;
};
