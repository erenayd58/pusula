"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { PlusIcon } from "lucide-react";
import { toast } from "sonner";
import { SubjectBadge } from "@/components/shared/subject-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCount, formatDateTr } from "@/lib/format";
import { deletePlaylist, keepPlaylistInCatalog } from "../server/actions";
import type { PlaylistRow } from "../types";

const BASE = "/coach/videos";

/**
 * Video kataloğu (koç, flat): kurum listeleri tablosu (ad, kanal, kaynak, ders, video sayısı,
 * atanan) + "Öğrenci ekledi" bölümü ("Katalogda tut" / "Kaldır").
 */
export function VideoCatalog({
  shared,
  studentAdded,
}: {
  shared: PlaylistRow[];
  studentAdded: PlaylistRow[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function keep(row: PlaylistRow) {
    startTransition(async () => {
      const result = await keepPlaylistInCatalog({ id: row.id });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(`“${row.title}” kataloğa alındı.`);
      router.refresh();
    });
  }

  function remove(row: PlaylistRow) {
    if (!window.confirm(`“${row.title}” kaldırılsın mı? Videoları ve izleme işaretleri silinir.`))
      return;
    startTransition(async () => {
      const result = await deletePlaylist({ id: row.id });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Liste kaldırıldı.");
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-end">
        <Button asChild>
          <Link href={`${BASE}/new`}>
            <PlusIcon aria-hidden="true" />
            Liste ekle
          </Link>
        </Button>
      </div>

      {shared.length === 0 ? (
        <p className="rounded-sm border border-line bg-bg-paper p-6 text-small text-ink-700">
          Katalogda video listesi yok. Bir YouTube oynatma listesi bağlantısı yapıştır; videolar
          başlık ve süreleriyle gelir, konulara eşleyip öğrenciye atarsın.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-sm border border-line bg-bg-paper">
          <table className="w-full text-small" data-testid="video-catalog">
            <thead className="text-left text-micro-lg text-ink-500">
              <tr className="border-b border-line">
                <th className="px-4 py-3 font-medium">Liste</th>
                <th className="px-4 py-3 font-medium">Kaynak</th>
                <th className="px-4 py-3 font-medium">Ders</th>
                <th className="px-4 py-3 text-right font-medium">Video</th>
                <th className="px-4 py-3 text-right font-medium">Atanan</th>
              </tr>
            </thead>
            <tbody>
              {shared.map((r) => (
                <tr
                  key={r.id}
                  data-testid="playlist-row"
                  className="border-b border-line last:border-b-0"
                >
                  <td className="px-4 py-3">
                    <div className="flex flex-col">
                      <Link
                        href={`${BASE}/${r.id}`}
                        className="font-medium text-ink-900 underline-offset-4 hover:underline"
                      >
                        {r.title}
                      </Link>
                      <span className="text-micro-lg text-ink-500">{r.channelName ?? "—"}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-ink-700">
                    {r.youtubePlaylistId
                      ? `YouTube${r.importedAt ? ` · ${formatDateTr(r.importedAt)}` : ""}`
                      : "Elle"}
                  </td>
                  <td className="px-4 py-3">
                    <SubjectCell row={r} />
                  </td>
                  <td className="px-4 py-3 text-right text-ink-900 tabular-nums">{r.videoCount}</td>
                  <td className="px-4 py-3 text-right text-ink-900 tabular-nums">
                    {formatCount(r.assignedCount, "öğrenci")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <section className="flex flex-col gap-3" aria-labelledby="student-added-videos-heading">
        <div className="flex flex-col gap-1">
          <h2 id="student-added-videos-heading" className="text-heading font-semibold text-ink-900">
            Öğrenci ekledi
          </h2>
          <p className="text-small text-ink-500">
            Öğrencilerin kendi eklediği listeler yalnızca o öğrenciye görünür.
          </p>
        </div>
        {studentAdded.length === 0 ? (
          <p className="text-small text-ink-500">Öğrenci eklemesi yok.</p>
        ) : (
          <div className="overflow-x-auto rounded-sm border border-line bg-bg-paper">
            <table className="w-full text-small" data-testid="student-added-videos">
              <thead className="text-left text-micro-lg text-ink-500">
                <tr className="border-b border-line">
                  <th className="px-4 py-3 font-medium">Öğrenci</th>
                  <th className="px-4 py-3 font-medium">Liste</th>
                  <th className="px-4 py-3 font-medium">Ders</th>
                  <th className="px-4 py-3 text-right font-medium">Video</th>
                  <th className="px-4 py-3 text-right font-medium">Eylemler</th>
                </tr>
              </thead>
              <tbody>
                {studentAdded.map((r) => (
                  <tr
                    key={r.id}
                    data-testid="student-added-playlist-row"
                    className="border-b border-line last:border-b-0"
                  >
                    <td className="px-4 py-3 text-ink-900">{r.studentName ?? "Öğrenci"}</td>
                    <td className="px-4 py-3">
                      <Link
                        href={`${BASE}/${r.id}`}
                        className="font-medium text-ink-900 underline-offset-4 hover:underline"
                      >
                        {r.title}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <SubjectCell row={r} />
                    </td>
                    <td className="px-4 py-3 text-right text-ink-900 tabular-nums">
                      {r.videoCount}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="secondary"
                          disabled={pending}
                          onClick={() => keep(r)}
                          aria-label={`${r.title} katalogda tut`}
                        >
                          Katalogda tut
                        </Button>
                        <Button
                          variant="secondary"
                          disabled={pending}
                          onClick={() => remove(r)}
                          aria-label={`${r.title} kaldır`}
                        >
                          Kaldır
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function SubjectCell({ row }: { row: PlaylistRow }) {
  if (row.subjectId && row.subjectColor && row.subjectShortName) {
    return <SubjectBadge color={row.subjectColor} shortName={row.subjectShortName} />;
  }
  return <Badge>Karışık</Badge>;
}
