"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { FormError } from "@/components/shared/form-error";
import { SubjectBadge } from "@/components/shared/subject-badge";
import { subjectVars } from "@/components/shared/subject-scope";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { weekStart } from "@/lib/dates";
import { formatCount, formatWeekRange } from "@/lib/format";
import { distributeEvenly } from "@/lib/strategy/school-calendar";
import { setTopicSchoolDates } from "../server/actions";
import type { TemplateEditor as TemplateEditorData, TemplateSubject } from "../types";

/** Takvim görünümünün varsayılan aralığı: 1. dönemin başlangıç–bitişi (dönem yoksa boş). */
export type CalendarRange = { from: string; to: string } | null;

/**
 * Şablon "Takvim" görünümü (Faz 5a, 09 §2 Parça 1; koç flat yüzey): ders başına bölüm; başlıkta
 * "Başlangıç · Bitiş · Ara tatil (isteğe bağlı) · Sıradan dağıt · Temizle", altında ünite konuları
 * satır satır tarih alanı + hafta etiketi ("12 – 18 Ekim"). "Sıradan dağıt" `distributeEvenly`
 * ile istemcide hesaplar ve dersin tüm satırlarını tek `setTopicSchoolDates` çağrısıyla yazar;
 * tek satır düzenlemesi de aynı eylemle. Alt konular listelenmez, üstünden okur (karar #29).
 */
export function TemplateCalendar({
  template,
  defaultRange,
}: {
  template: TemplateEditorData;
  defaultRange: CalendarRange;
}) {
  return (
    <div className="flex flex-col gap-6">
      {template.subjects.map((subject) => (
        <SubjectCalendar key={subject.subjectId} subject={subject} defaultRange={defaultRange} />
      ))}
    </div>
  );
}

function weekLabel(date: string): string {
  return `${formatWeekRange(weekStart(date))} haftası`;
}

function SubjectCalendar({
  subject,
  defaultRange,
}: {
  subject: TemplateSubject;
  defaultRange: CalendarRange;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [dates, setDates] = useState<Record<string, string | null>>(() =>
    Object.fromEntries(subject.topics.map((t) => [t.id, t.schoolFinishOn])),
  );
  const [from, setFrom] = useState(defaultRange?.from ?? "");
  const [to, setTo] = useState(defaultRange?.to ?? "");
  const [skipFrom, setSkipFrom] = useState("");
  const [skipTo, setSkipTo] = useState("");
  const [error, setError] = useState<string>();
  const headingId = `template-calendar-${subject.subjectId}`;
  const id = (suffix: string) => `calendar-${subject.subjectId}-${suffix}`;
  const filled = subject.topics.filter((t) => dates[t.id]).length;

  function save(rows: { topicId: string; schoolFinishOn: string | null }[], success?: string) {
    setError(undefined);
    startTransition(async () => {
      const result = await setTopicSchoolDates({ rows });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setDates((prev) => ({
        ...prev,
        ...Object.fromEntries(rows.map((r) => [r.topicId, r.schoolFinishOn])),
      }));
      if (success) toast.success(success);
      router.refresh();
    });
  }

  function distribute() {
    const skip = skipFrom && skipTo ? { from: skipFrom, to: skipTo } : null;
    const mondays = distributeEvenly({ count: subject.topics.length, from, to, skip });
    if (mondays.length !== subject.topics.length) {
      setError("Aralıkta uygun hafta yok; başlangıç ve bitişi kontrol et.");
      return;
    }
    save(
      subject.topics.map((t, i) => ({ topicId: t.id, schoolFinishOn: mondays[i]! })),
      `${subject.name}: ${formatCount(subject.topics.length, "konu")} takvime dağıtıldı.`,
    );
  }

  function clear() {
    save(
      subject.topics.map((t) => ({ topicId: t.id, schoolFinishOn: null })),
      `${subject.name}: okul tarihleri temizlendi.`,
    );
  }

  const canDistribute =
    !pending && subject.topics.length > 0 && from !== "" && to !== "" && to >= from;

  return (
    <section
      aria-labelledby={headingId}
      style={subjectVars(subject.color)}
      className="rounded-sm border border-line bg-bg-paper"
    >
      <header className="flex flex-col gap-3 border-b border-line px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id={headingId} className="flex items-center gap-3 text-heading font-semibold">
            <SubjectBadge color={subject.color} shortName={subject.shortName} />
            {subject.name}
          </h2>
          <span className="text-small text-ink-500">
            {filled} / {formatCount(subject.topics.length, "konu")} tarihli
          </span>
        </div>
        <form
          className="flex flex-wrap items-end gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            distribute();
          }}
        >
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={id("from")}>Başlangıç</Label>
            <Input
              id={id("from")}
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="w-40"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={id("to")}>Bitiş</Label>
            <Input
              id={id("to")}
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="w-40"
            />
          </div>
          <fieldset className="flex flex-wrap items-end gap-2">
            <legend className="mb-1.5 text-small font-medium text-ink-700">
              Ara tatil (isteğe bağlı)
            </legend>
            <Input
              aria-label={`${subject.name}: ara tatil başlangıcı`}
              type="date"
              value={skipFrom}
              onChange={(e) => setSkipFrom(e.target.value)}
              className="w-40"
            />
            <Input
              aria-label={`${subject.name}: ara tatil bitişi`}
              type="date"
              value={skipTo}
              onChange={(e) => setSkipTo(e.target.value)}
              className="w-40"
            />
          </fieldset>
          <div className="flex flex-wrap gap-2">
            <Button type="submit" variant="secondary" disabled={!canDistribute}>
              Sıradan dağıt
            </Button>
            <Button
              type="button"
              variant="ghost"
              disabled={pending || filled === 0}
              onClick={clear}
            >
              Temizle
            </Button>
          </div>
        </form>
        <FormError message={error} />
      </header>

      {subject.topics.length === 0 ? (
        <p className="px-4 py-3 text-small text-ink-500">Bu derste henüz konu yok.</p>
      ) : (
        <ol className="divide-y divide-line">
          {subject.topics.map((topic) => {
            const value = dates[topic.id] ?? "";
            return (
              <li
                key={topic.id}
                className="grid grid-cols-[minmax(0,1fr)_10.5rem] items-center gap-x-3 gap-y-1 px-4 py-2 md:grid-cols-[minmax(0,1fr)_10.5rem_11rem]"
              >
                <Label htmlFor={id(topic.id)} className="text-body font-normal">
                  {topic.name}
                </Label>
                <Input
                  id={id(topic.id)}
                  type="date"
                  value={value}
                  onChange={(e) => {
                    const next = e.target.value || null;
                    setDates((prev) => ({ ...prev, [topic.id]: next }));
                    // Tarih seçicide tam tarih girilince (ya da alan temizlenince) kaydedilir.
                    if (next === null || /^\d{4}-\d{2}-\d{2}$/.test(next)) {
                      save([{ topicId: topic.id, schoolFinishOn: next }]);
                    }
                  }}
                />
                <span className="col-span-2 text-micro-lg text-ink-500 md:col-span-1 md:text-small">
                  {value ? weekLabel(value) : "Tarih yok"}
                </span>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
