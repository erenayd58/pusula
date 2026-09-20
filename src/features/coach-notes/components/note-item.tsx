"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { PencilIcon, PinIcon, PinOffIcon, Trash2Icon } from "lucide-react";
import { toast } from "sonner";
import { FormError } from "@/components/shared/form-error";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ResponsiveSheet,
  ResponsiveSheetContent,
  ResponsiveSheetDescription,
  ResponsiveSheetFooter,
  ResponsiveSheetHeader,
  ResponsiveSheetTitle,
  ResponsiveSheetTrigger,
} from "@/components/ui/responsive-sheet";
import { noteVisibilityLabels } from "@/content/labels";
import { formatDateTr } from "@/lib/format";
import { deleteNote, togglePin } from "../server/actions";
import type { CoachNote } from "../types";
import { NoteForm } from "./note-form";

/**
 * Tek not kartı: gövde + tarih; koçta görünürlük rozeti, sabitle / düzenle (satır içi form) / sil
 * (onaylı). Öğrenci ve veli salt okunur (clay-sm kart). Sabitlenmiş not ikonla işaretlenir.
 */
export function NoteItem({
  note,
  audience,
}: {
  note: CoachNote;
  audience: "coach" | "student" | "parent";
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  function pin() {
    setError(undefined);
    startTransition(async () => {
      const result = await togglePin({
        id: note.id,
        studentId: note.studentId,
        isPinned: !note.isPinned,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      toast.success(note.isPinned ? "Sabitleme kaldırıldı." : "Not sabitlendi.");
      router.refresh();
    });
  }

  function remove() {
    setError(undefined);
    startTransition(async () => {
      const result = await deleteNote({ id: note.id, studentId: note.studentId });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      toast.success("Not silindi.");
      setConfirmOpen(false);
      router.refresh();
    });
  }

  return (
    <li
      data-testid="note-item"
      className="flex flex-col gap-3 rounded-sm border border-line bg-bg-paper p-4 clay:rounded-card clay:border-0 clay:clay-sm clay:bg-bg-raised"
    >
      {editing ? (
        <NoteForm
          studentId={note.studentId}
          note={note}
          autoFocus
          onDone={() => setEditing(false)}
        />
      ) : (
        <>
          <p className="text-body whitespace-pre-line text-ink-900">{note.body}</p>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-small text-ink-500">
            <span>{formatDateTr(note.createdAt, { year: true })}</span>
            {audience !== "coach" && note.authorName ? <span>{note.authorName}</span> : null}
            {note.isPinned ? (
              <span className="inline-flex items-center gap-1 text-ink-700">
                <PinIcon aria-hidden="true" className="size-3.5" />
                Sabit
              </span>
            ) : null}
            {audience === "coach" ? <Badge>{noteVisibilityLabels[note.visibility]}</Badge> : null}
          </div>
        </>
      )}

      {audience === "coach" && !editing ? (
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="ghost" onClick={pin} disabled={pending}>
            {note.isPinned ? <PinOffIcon aria-hidden="true" /> : <PinIcon aria-hidden="true" />}
            {note.isPinned ? "Sabiti kaldır" : "Sabitle"}
          </Button>
          <Button type="button" variant="ghost" onClick={() => setEditing(true)}>
            <PencilIcon aria-hidden="true" />
            Düzenle
          </Button>
          <ResponsiveSheet open={confirmOpen} onOpenChange={setConfirmOpen}>
            <ResponsiveSheetTrigger asChild>
              <Button type="button" variant="ghost">
                <Trash2Icon aria-hidden="true" />
                Sil
              </Button>
            </ResponsiveSheetTrigger>
            <ResponsiveSheetContent className="sm:max-w-md">
              <ResponsiveSheetHeader>
                <ResponsiveSheetTitle>Notu sil</ResponsiveSheetTitle>
                <ResponsiveSheetDescription>
                  Not kalıcı olarak silinir; gönderilmiş bildirimler kalır.
                </ResponsiveSheetDescription>
              </ResponsiveSheetHeader>
              <FormError message={error} />
              <ResponsiveSheetFooter>
                <Button type="button" variant="secondary" onClick={() => setConfirmOpen(false)}>
                  Vazgeç
                </Button>
                <Button type="button" onClick={remove} disabled={pending}>
                  {pending ? "Siliniyor…" : "Notu sil"}
                </Button>
              </ResponsiveSheetFooter>
            </ResponsiveSheetContent>
          </ResponsiveSheet>
        </div>
      ) : null}
      {!confirmOpen ? <FormError message={error} /> : null}
    </li>
  );
}
