"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { PencilIcon, Trash2Icon, UserPlusIcon, XIcon } from "lucide-react";
import { toast } from "sonner";
import { StudentPicker, type PickableStudent } from "@/components/shared/student-picker";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCount } from "@/lib/format";
import {
  assignPlaylist,
  deletePlaylist,
  keepPlaylistInCatalog,
  unassignPlaylist,
} from "../server/actions";
import type { PlaylistDetail } from "../types";

const BASE = "/coach/videos";

/** Koç liste detayı başlık eylemleri: (özel listede) Katalogda tut · Düzenle · Kaldır. */
export function PlaylistActions({ playlist }: { playlist: PlaylistDetail }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function keep() {
    startTransition(async () => {
      const result = await keepPlaylistInCatalog({ id: playlist.id });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Liste kataloğa alındı.");
      router.refresh();
    });
  }

  function remove() {
    if (
      !window.confirm(
        `“${playlist.title}” kaldırılsın mı? Videoları ve izleme işaretleri silinir; plan görevleri kalır.`,
      )
    )
      return;
    startTransition(async () => {
      const result = await deletePlaylist({ id: playlist.id });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Liste kaldırıldı.");
      router.push(BASE);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {playlist.studentId ? (
        <>
          <Badge>{`Öğrenci ekledi: ${playlist.studentName ?? "—"}`}</Badge>
          <Button type="button" variant="secondary" onClick={keep} disabled={pending}>
            Katalogda tut
          </Button>
        </>
      ) : null}
      <Button variant="secondary" asChild>
        <Link href={`${BASE}/${playlist.id}?edit=1`}>
          <PencilIcon aria-hidden="true" />
          Düzenle
        </Link>
      </Button>
      <Button type="button" variant="secondary" onClick={remove} disabled={pending}>
        <Trash2Icon aria-hidden="true" />
        Kaldır
      </Button>
    </div>
  );
}

/** "Öğrenciye ata" (koç): ortak `StudentPicker` → `assignPlaylist`. */
export function AssignPlaylistButton({
  playlistId,
  playlistTitle,
  students,
}: {
  playlistId: string;
  playlistTitle: string;
  students: PickableStudent[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function confirm(studentIds: string[]) {
    startTransition(async () => {
      const result = await assignPlaylist({ playlistId, studentIds });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(result.data.message);
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <>
      <Button type="button" onClick={() => setOpen(true)}>
        <UserPlusIcon aria-hidden="true" />
        Öğrenciye ata
      </Button>
      <StudentPicker
        open={open}
        onOpenChange={setOpen}
        title="Öğrenciye ata"
        description={`“${playlistTitle}” seçtiğin öğrencilerin video listesine eklenir.`}
        students={students}
        pending={pending}
        onConfirm={confirm}
      />
    </>
  );
}

/** Atanmış öğrenciler + "Öğrenciye ata"; satırda atamayı kaldır. */
export function AssignedPlaylistStudents({
  playlist,
  students,
}: {
  playlist: PlaylistDetail;
  students: PickableStudent[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function unassign(studentId: string, fullName: string) {
    if (!window.confirm(`${fullName} için atama kaldırılsın mı? İzleme işaretleri kalır.`)) return;
    startTransition(async () => {
      const result = await unassignPlaylist({ playlistId: playlist.id, studentId });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Atama kaldırıldı.");
      router.refresh();
    });
  }

  return (
    <section className="flex flex-col gap-3" aria-labelledby="assigned-playlist-heading">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="assigned-playlist-heading" className="text-heading font-semibold text-ink-900">
          {`Atanan öğrenciler · ${formatCount(playlist.assigned.length, "öğrenci")}`}
        </h2>
        <AssignPlaylistButton
          playlistId={playlist.id}
          playlistTitle={playlist.title}
          students={students}
        />
      </div>
      {playlist.assigned.length === 0 ? (
        <p className="text-small text-ink-500">Henüz atanmadı.</p>
      ) : (
        <ul className="flex flex-wrap gap-2" data-testid="assigned-students">
          {playlist.assigned.map((a) => (
            <li
              key={a.studentId}
              className="flex items-center gap-1 rounded-xs border border-line bg-bg-paper py-1 pr-1 pl-3 text-small"
            >
              <Link
                href={`/coach/students/${a.studentId}/videos`}
                className="text-ink-900 underline-offset-4 hover:underline"
              >
                {a.fullName}
              </Link>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-7 pointer-coarse:size-9"
                aria-label={`${a.fullName} atamasını kaldır`}
                disabled={pending}
                onClick={() => unassign(a.studentId, a.fullName)}
              >
                <XIcon aria-hidden="true" className="size-3.5" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
