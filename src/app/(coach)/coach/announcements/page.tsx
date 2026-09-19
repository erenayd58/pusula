import type { Metadata } from "next";
import { AnnouncementForm, AnnouncementList, listAnnouncements } from "@/features/announcements";
import { listStudents } from "@/features/core";
import { requireRole } from "@/lib/auth";

export const metadata: Metadata = { title: "Duyurular" };

/**
 * Duyurular (koç; 12 §2 Adım 4): üstte form (başlık, metin, hedef, öğrenci kapsamı), altta
 * gönderilenler. Koç yalnızca kendi öğrencilerine ulaşır (tetikleyici süzer), owner kurumun tümüne.
 */
export default async function AnnouncementsPage() {
  await requireRole("coach", "owner");
  const [announcements, students] = await Promise.all([listAnnouncements(), listStudents()]);

  return (
    <>
      <header className="flex flex-col gap-1">
        <h1 className="text-title font-semibold tracking-tight">Duyurular</h1>
        <p className="text-small text-ink-500">
          Öğrencilere ve velilere bildirim olarak gider; düzenlenemez, gerekirse silip yeniden yaz.
        </p>
      </header>
      <section
        aria-labelledby="announcement-form-heading"
        className="flex flex-col gap-3 rounded-sm border border-line bg-bg-paper p-4"
      >
        <h2 id="announcement-form-heading" className="text-heading font-semibold text-ink-900">
          Yeni duyuru
        </h2>
        <AnnouncementForm
          students={students
            .filter((s) => s.status === "active")
            .map((s) => ({ studentId: s.profileId, fullName: s.fullName }))}
        />
      </section>
      <section aria-labelledby="announcements-heading" className="flex flex-col gap-3">
        <h2 id="announcements-heading" className="text-heading font-semibold text-ink-900">
          Gönderilenler
        </h2>
        <AnnouncementList announcements={announcements} />
      </section>
    </>
  );
}
