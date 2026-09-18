"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { FormError } from "@/components/shared/form-error";
import { SubjectBadge } from "@/components/shared/subject-badge";
import { subjectVars } from "@/components/shared/subject-scope";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { topicStatusLabels } from "@/content/labels";
import { weekStart } from "@/lib/dates";
import { formatWeekRange } from "@/lib/format";
import { updateTopicTarget } from "../server/actions";
import type { StudentTargets } from "../types";

/**
 * Konu hedef listesi (Faz 5b): ders başına konu satırı — ad, durum, hedef hafta (`input
 * type="date"`, tek satır `updateTopicTarget`), okul haftası (varsa), gecikmişse nötr rozet
 * "Hedef geçti". Hedef kurulmadıysa boş metin.
 */
export function TopicTargetList({ targets, today }: { targets: StudentTargets; today: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string>();
  const [dates, setDates] = useState<Record<string, string | null>>(() =>
    Object.fromEntries(targets.topics.map((t) => [t.topicId, t.targetOn])),
  );

  if (targets.topicsFinishBy === null) {
    return (
      <p className="rounded-sm border border-line bg-bg-paper p-4 text-small text-ink-700">
        Hedef kurulmadı. Yukarıdaki formla toplam soruyu gir ve takvimi oluştur; konular buraya
        haftalarıyla gelir.
      </p>
    );
  }

  function save(topicId: string, targetOn: string) {
    setError(undefined);
    startTransition(async () => {
      const result = await updateTopicTarget({ studentId: targets.studentId, topicId, targetOn });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      toast.success("Konu hedefi güncellendi.");
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <FormError message={error} />
      {targets.subjects.map((subject) => {
        const rows = targets.topics.filter((t) => t.subjectId === subject.subjectId);
        const headingId = `topic-targets-${subject.subjectId}`;
        return (
          <section
            key={subject.subjectId}
            aria-labelledby={headingId}
            style={subjectVars(subject.color)}
            className="rounded-sm border border-line bg-bg-paper"
          >
            <h3
              id={headingId}
              className="flex items-center gap-3 border-b border-line px-4 py-2 text-small font-semibold text-ink-900"
            >
              <SubjectBadge color={subject.color} shortName={subject.shortName} />
              {subject.name}
            </h3>
            <ol className="divide-y divide-line">
              {rows.map((t) => {
                const value = dates[t.topicId] ?? "";
                const overdue = !t.done && value !== "" && value <= today;
                const id = `topic-target-${t.topicId}`;
                return (
                  <li
                    key={t.topicId}
                    className="grid grid-cols-[minmax(0,1fr)_10.5rem] items-center gap-x-3 gap-y-1 px-4 py-2 md:grid-cols-[minmax(0,1fr)_8rem_10.5rem_minmax(0,1fr)]"
                  >
                    <Label
                      htmlFor={id}
                      className="flex min-w-0 flex-wrap items-center gap-2 font-normal"
                    >
                      <span className="truncate">{t.name}</span>
                      {overdue ? <Badge>Hedef geçti</Badge> : null}
                    </Label>
                    <span className="order-last col-span-2 text-micro-lg text-ink-500 md:order-none md:col-span-1">
                      {topicStatusLabels[t.status]}
                    </span>
                    <Input
                      id={id}
                      type="date"
                      value={value}
                      disabled={pending || t.done}
                      aria-label={`${t.name}: hedef tarihi`}
                      onChange={(e) => {
                        const next = e.target.value;
                        setDates((prev) => ({ ...prev, [t.topicId]: next || null }));
                        if (/^\d{4}-\d{2}-\d{2}$/.test(next)) save(t.topicId, next);
                      }}
                    />
                    <span className="order-last col-span-2 text-micro-lg text-ink-500 md:order-none md:col-span-1 md:text-small">
                      {value ? `Hedef: ${formatWeekRange(weekStart(value))}` : "Hedef yok"}
                      {t.schoolFinishOn
                        ? ` · Okul: ${formatWeekRange(weekStart(t.schoolFinishOn))}`
                        : ""}
                    </span>
                  </li>
                );
              })}
            </ol>
          </section>
        );
      })}
    </div>
  );
}
