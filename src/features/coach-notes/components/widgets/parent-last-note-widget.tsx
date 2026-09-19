import Link from "next/link";
import { ChevronRightIcon } from "lucide-react";
import { formatDateTr } from "@/lib/format";
import type { ParentSummaryWidgetProps } from "@/modules/define-module";
import { getLastParentNote } from "../../server/queries";

/**
 * Veli Özet kartı (12 §2 Adım 6, order 70): koçun veliye açık son notu (RLS süzer), tarih,
 * Notlar sekmesine gider. "Siz" dili; not yoksa kart çizilmez.
 */
export async function ParentLastNoteWidget({ studentId }: ParentSummaryWidgetProps) {
  const note = await getLastParentNote(studentId);
  if (!note) return null;
  return (
    <Link
      href={`/parent/${studentId}/notes`}
      data-testid="parent-last-note"
      className="flex clay-press items-center gap-3 rounded-card clay-sm bg-bg-raised p-4"
    >
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="text-small text-ink-500">Koçun notu · {formatDateTr(note.createdAt)}</span>
        <span className="line-clamp-3 text-body whitespace-pre-line text-ink-900">{note.body}</span>
        <span className="text-small text-ink-700">Tüm notlar</span>
      </span>
      <ChevronRightIcon aria-hidden="true" className="size-5 shrink-0 text-ink-500" />
    </Link>
  );
}
