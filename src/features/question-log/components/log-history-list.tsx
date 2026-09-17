"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { PencilIcon, Trash2Icon } from "lucide-react";
import { toast } from "sonner";
import { SubjectBadge } from "@/components/shared/subject-badge";
import { Button } from "@/components/ui/button";
import {
  ResponsiveSheet,
  ResponsiveSheetContent,
  ResponsiveSheetDescription,
  ResponsiveSheetFooter,
  ResponsiveSheetHeader,
  ResponsiveSheetTitle,
} from "@/components/ui/responsive-sheet";
import { toDateKey, todayInIstanbul } from "@/lib/dates";
import { formatCount, formatDateTr } from "@/lib/format";
import { cn } from "@/lib/utils";
import { NO_TOPIC_LABEL, formatLogCounts } from "../lib/format-log";
import { deleteQuestionLog } from "../server/actions";
import type { QuestionLogRow } from "../types";
import { useQuickLog } from "./quick-log-provider";

/**
 * Kayıt geçmişi (öğrenci, clay): gün gruplu liste; satırda Düzenle (hızlı kayıt sheet'i
 * düzenleme modunda) ve Sil (onaylı). Silme onayı aynı ResponsiveSheet bileşeniyle.
 */
export function LogHistoryList({ rows }: { rows: QuestionLogRow[] }) {
  const { open } = useQuickLog();
  const [toDelete, setToDelete] = useState<QuestionLogRow | null>(null);
  const todayKey = toDateKey(todayInIstanbul());

  const groups = new Map<string, QuestionLogRow[]>();
  for (const r of rows) groups.set(r.logDate, [...(groups.get(r.logDate) ?? []), r]);

  return (
    <>
      <div className="flex flex-col gap-4">
        {[...groups.entries()].map(([day, items]) => {
          const total = items.reduce((s, r) => s + r.total, 0);
          return (
            <section key={day} aria-label={formatDateTr(day, { weekday: true })}>
              <h2 className="mb-2 flex items-baseline justify-between text-small font-medium text-ink-700">
                <span>{day === todayKey ? "Bugün" : formatDateTr(day, { weekday: true })}</span>
                <span className="text-ink-500">{formatCount(total, "soru")}</span>
              </h2>
              <ul className="flex flex-col divide-y divide-line rounded-card clay-sm px-4">
                {items.map((r) => (
                  <li key={r.id} className="flex items-center gap-2 py-3 sm:gap-3">
                    <SubjectBadge
                      color={r.subjectColor}
                      shortName={r.subjectShortName}
                      className="clay:min-h-8 clay:px-2.5 clay:text-micro-lg"
                    />
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span
                        className={cn(
                          "line-clamp-2 text-body",
                          r.topicName ? "text-ink-900" : "text-ink-500",
                        )}
                      >
                        {r.topicName ?? NO_TOPIC_LABEL}
                      </span>
                      <span className="text-small text-ink-500">{formatLogCounts(r)}</span>
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="clay:size-11"
                      aria-label={`Düzenle: ${r.subjectName}${r.topicName ? ` · ${r.topicName}` : ""}, ${formatDateTr(r.logDate)}`}
                      onClick={() =>
                        open({
                          id: r.id,
                          logDate: r.logDate,
                          subjectId: r.subjectId,
                          topicId: r.topicId,
                          correct: r.correct,
                          wrong: r.wrong,
                          blank: r.blank,
                          durationMinutes: r.durationMinutes,
                        })
                      }
                    >
                      <PencilIcon aria-hidden="true" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="clay:size-11"
                      aria-label={`Sil: ${r.subjectName}${r.topicName ? ` · ${r.topicName}` : ""}, ${formatDateTr(r.logDate)}`}
                      onClick={() => setToDelete(r)}
                    >
                      <Trash2Icon aria-hidden="true" />
                    </Button>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
      <DeleteLogSheet row={toDelete} onOpenChange={(o) => !o && setToDelete(null)} />
    </>
  );
}

function DeleteLogSheet({
  row,
  onOpenChange,
}: {
  row: QuestionLogRow | null;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function confirm() {
    if (!row || pending) return;
    startTransition(async () => {
      const result = await deleteQuestionLog({ id: row.id });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Kayıt silindi.");
      onOpenChange(false);
      router.refresh();
    });
  }

  return (
    <ResponsiveSheet open={row !== null} onOpenChange={onOpenChange}>
      <ResponsiveSheetContent className="sm:max-w-md">
        <ResponsiveSheetHeader>
          <ResponsiveSheetTitle>Kaydı sil</ResponsiveSheetTitle>
          <ResponsiveSheetDescription>
            {row
              ? `${formatDateTr(row.logDate)} · ${row.subjectName}${row.topicName ? ` · ${row.topicName}` : ""} · ${formatCount(row.total, "soru")}. Bu kayıt silinince bugünkü ve haftalık toplamlar da değişir.`
              : ""}
          </ResponsiveSheetDescription>
        </ResponsiveSheetHeader>
        <ResponsiveSheetFooter>
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
            Vazgeç
          </Button>
          <Button type="button" onClick={confirm} disabled={pending}>
            {pending ? "Siliniyor…" : "Kaydı sil"}
          </Button>
        </ResponsiveSheetFooter>
      </ResponsiveSheetContent>
    </ResponsiveSheet>
  );
}
