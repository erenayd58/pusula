import { MegaphoneIcon } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { Badge } from "@/components/ui/badge";
import { formatCount, formatDateTr } from "@/lib/format";
import type { Announcement } from "../types";
import { DeleteAnnouncementButton } from "./delete-announcement-button";

function audienceText(a: Announcement): string {
  const roles = a.roles.map((r) => (r === "student" ? "öğrenciler" : "veliler")).join(" ve ");
  const scope =
    a.studentIds === null ? "tüm öğrenciler" : formatCount(a.studentIds.length, "öğrenci");
  return `${roles} · ${scope}`;
}

/** Gönderilmiş duyurular (koç): başlık, metin, hedef özeti, tarih, sil. Düzenleme yok (E3). */
export function AnnouncementList({ announcements }: { announcements: Announcement[] }) {
  if (announcements.length === 0) {
    return (
      <EmptyState
        icon={MegaphoneIcon}
        title="Henüz duyuru yok"
        description="İlk duyuruyu yaz; öğrenciler ve veliler bildirim olarak alır."
      />
    );
  }
  return (
    <ul className="flex flex-col gap-3" aria-label="Duyurular" data-testid="announcement-list">
      {announcements.map((a) => (
        <li
          key={a.id}
          data-testid="announcement-item"
          className="flex flex-col gap-2 rounded-sm border border-line bg-bg-paper p-4"
        >
          <div className="flex flex-wrap items-start justify-between gap-2">
            <h3 className="text-body font-semibold text-ink-900">{a.title}</h3>
            <DeleteAnnouncementButton id={a.id} title={a.title} />
          </div>
          <p className="text-small whitespace-pre-line text-ink-900">{a.body}</p>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-micro-lg text-ink-500">
            <Badge>{audienceText(a)}</Badge>
            <span>{formatDateTr(a.createdAt, { year: true })}</span>
            {a.authorName ? <span>{a.authorName}</span> : null}
          </div>
        </li>
      ))}
    </ul>
  );
}
