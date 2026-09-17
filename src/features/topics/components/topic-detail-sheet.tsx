"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { SubjectBadge } from "@/components/shared/subject-badge";
import { subjectVars } from "@/components/shared/subject-scope";
import { Button } from "@/components/ui/button";
import {
  ResponsiveSheet,
  ResponsiveSheetContent,
  ResponsiveSheetDescription,
  ResponsiveSheetFooter,
  ResponsiveSheetHeader,
  ResponsiveSheetTitle,
} from "@/components/ui/responsive-sheet";
import { topicStatusLabels } from "@/content/labels";
import { FormError } from "@/components/shared/form-error";
import { formatDateTr } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { TopicStatus } from "@/types";
import { topicStatusValues } from "../schemas";
import { setTopicProgress } from "../server/actions";
import type { TopicMapCell, TopicMapSubject } from "../types";
import { TopicSwatch } from "./topic-cell";

const CONFIDENCE = [1, 2, 3, 4, 5] as const;
const CONFIDENCE_HINT: Record<number, string> = {
  1: "Hiç emin değilim",
  2: "Zorlanıyorum",
  3: "İdare eder",
  4: "İyi",
  5: "Çok iyi",
};

export type TopicDetailSelection = { subject: TopicMapSubject; cell: TopicMapCell };

/**
 * Hücre detayı: telefonda alt panel, masaüstünde diyalog (ResponsiveSheet; 02 karar #30).
 * Durum ve 1-5 güven puanı seçilir, kaydedilir. Soru sayısı/başarı/kaynak alanları
 * Faz 3 ve 5'te eklenir.
 */
export function TopicDetailSheet({
  selection,
  studentId,
  audience,
  onOpenChange,
  onSaved,
}: {
  selection: TopicDetailSelection | null;
  studentId: string;
  /** "student": sen dili; "coach": nötr. */
  audience: "student" | "coach";
  onOpenChange: (open: boolean) => void;
  onSaved: (
    topicId: string,
    cell: Pick<TopicMapCell, "status" | "confidence" | "completedAt">,
  ) => void;
}) {
  return (
    <ResponsiveSheet open={selection !== null} onOpenChange={onOpenChange}>
      <ResponsiveSheetContent
        className="sm:max-w-md"
        style={selection ? subjectVars(selection.subject.color) : undefined}
      >
        {selection ? (
          // key: seçim değişince form o hücrenin değerleriyle sıfırdan kurulur (effect yok).
          <DetailForm
            key={selection.cell.topicId}
            selection={selection}
            studentId={studentId}
            audience={audience}
            onOpenChange={onOpenChange}
            onSaved={onSaved}
          />
        ) : null}
      </ResponsiveSheetContent>
    </ResponsiveSheet>
  );
}

function DetailForm({
  selection,
  studentId,
  audience,
  onOpenChange,
  onSaved,
}: {
  selection: TopicDetailSelection;
  studentId: string;
  audience: "student" | "coach";
  onOpenChange: (open: boolean) => void;
  onSaved: (
    topicId: string,
    cell: Pick<TopicMapCell, "status" | "confidence" | "completedAt">,
  ) => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [status, setStatus] = useState<TopicStatus>(selection.cell.status);
  const [confidence, setConfidence] = useState<number | null>(selection.cell.confidence);
  const [error, setError] = useState<string>();
  const { subject, cell } = selection;

  function save() {
    setError(undefined);
    startTransition(async () => {
      const result = await setTopicProgress({
        studentId,
        topicId: cell.topicId,
        status,
        confidence,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      onSaved(cell.topicId, result.data);
      toast.success(`Kaydedildi: ${cell.name} · ${topicStatusLabels[status]}.`);
      onOpenChange(false);
      router.refresh();
    });
  }

  return (
    <>
      <ResponsiveSheetHeader>
        <SubjectBadge color={subject.color} shortName={subject.shortName} />
        <ResponsiveSheetTitle>{cell.name}</ResponsiveSheetTitle>
        <ResponsiveSheetDescription>
          {cell.completedAt
            ? `Tamamlandı: ${formatDateTr(new Date(cell.completedAt))}`
            : audience === "student"
              ? "Bu konuda neredesin? Durumu ve kendine güvenini işaretle."
              : "Öğrencinin bu konudaki durumu ve güven puanı."}
        </ResponsiveSheetDescription>
      </ResponsiveSheetHeader>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-small font-medium text-ink-700">Durum</legend>
        {topicStatusValues.map((value) => (
          <label
            key={value}
            className={cn(
              "flex min-h-11 cursor-pointer items-center gap-3 rounded-sm border border-line bg-bg-paper px-3 text-body",
              "has-checked:border-ink-900 has-checked:bg-bg-surface has-focus-visible:outline-2 has-focus-visible:outline-focus",
              "clay:rounded-md clay:border-0 clay:clay-sm clay:has-checked:clay-pressed",
            )}
          >
            <input
              type="radio"
              name="topic-status"
              value={value}
              checked={status === value}
              onChange={() => setStatus(value)}
              className="sr-only"
            />
            <TopicSwatch status={value} className="size-7" />
            {topicStatusLabels[value]}
          </label>
        ))}
      </fieldset>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-small font-medium text-ink-700">
          {audience === "student" ? "Kendine güvenin (1-5)" : "Güven puanı (1-5)"}
        </legend>
        <div className="flex gap-2" role="group">
          {CONFIDENCE.map((n) => (
            <label
              key={n}
              title={CONFIDENCE_HINT[n]}
              className={cn(
                "flex size-11 cursor-pointer items-center justify-center rounded-sm border border-line bg-bg-paper text-body font-semibold",
                "has-checked:border-ink-900 has-checked:bg-ink-900 has-checked:text-bg-paper has-focus-visible:outline-2 has-focus-visible:outline-focus",
                "clay:size-12 clay:rounded-md clay:border-0 clay:clay-sm clay:has-checked:clay-pressed clay:has-checked:bg-ink-900",
              )}
            >
              <input
                type="radio"
                name="topic-confidence"
                value={n}
                checked={confidence === n}
                onChange={() => setConfidence(n)}
                onClick={() => {
                  if (confidence === n) setConfidence(null);
                }}
                aria-label={`${n}: ${CONFIDENCE_HINT[n]}`}
                className="sr-only"
              />
              {n}
            </label>
          ))}
        </div>
        <p className="text-micro-lg text-ink-500">
          {confidence
            ? CONFIDENCE_HINT[confidence]
            : "İstersen boş bırak; seçili puana tekrar dokununca kalkar."}
        </p>
      </fieldset>

      <FormError message={error} />

      <ResponsiveSheetFooter>
        <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
          Vazgeç
        </Button>
        <Button type="button" onClick={save} disabled={pending}>
          {pending ? "Kaydediliyor…" : "Kaydet"}
        </Button>
      </ResponsiveSheetFooter>
    </>
  );
}
