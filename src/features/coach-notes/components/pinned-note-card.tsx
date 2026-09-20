import Link from "next/link";
import { PinIcon } from "lucide-react";
import { formatDateTr } from "@/lib/format";
import { noteVisibilityLabels } from "@/content/labels";
import { getPinnedNote } from "../server/queries";

/** K2 Genel bakış: sabitlenmiş en yeni not (04 §8.4). Yoksa kart çizilmez. */
export async function PinnedNoteCard({ studentId }: { studentId: string }) {
  const note = await getPinnedNote(studentId);
  if (!note) return null;
  return (
    <div
      data-testid="pinned-note"
      className="flex flex-col gap-1 rounded-sm border border-line bg-bg-paper px-4 py-3"
    >
      <span className="inline-flex items-center gap-1.5 text-micro-lg text-ink-500">
        <PinIcon aria-hidden="true" className="size-3.5" />
        Sabitlenmiş not · {noteVisibilityLabels[note.visibility]}
      </span>
      <p className="text-small whitespace-pre-line text-ink-900">{note.body}</p>
      <span className="text-micro-lg text-ink-500">
        {formatDateTr(note.createdAt)} ·{" "}
        <Link
          href={`/coach/students/${studentId}/notes`}
          className="text-ink-700 underline underline-offset-4"
        >
          Tüm notlar
        </Link>
      </span>
    </div>
  );
}
