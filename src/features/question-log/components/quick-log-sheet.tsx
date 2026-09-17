"use client";

import { useRef, useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { FormError } from "@/components/shared/form-error";
import { NativeSelect } from "@/components/shared/native-select";
import { NumberStepper } from "@/components/shared/number-stepper";
import { subjectVars } from "@/components/shared/subject-scope";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ResponsiveSheet,
  ResponsiveSheetContent,
  ResponsiveSheetDescription,
  ResponsiveSheetFooter,
  ResponsiveSheetHeader,
  ResponsiveSheetTitle,
} from "@/components/ui/responsive-sheet";
import { toDateKey, todayInIstanbul } from "@/lib/dates";
import { calculateNet } from "@/lib/exam/net";
import { formatDateTr, formatNet } from "@/lib/format";
import { cn } from "@/lib/utils";
import { saveToastMessage } from "../lib/save-toast";
import { createQuestionLogSchema, updateQuestionLogSchema } from "../schemas";
import { createQuestionLog, updateQuestionLog } from "../server/actions";
import type { QuickLogInitial, QuickLogOptions } from "../types";

/** Son kullanılan ders/konu: cihaz başına, localStorage (02 karar #34). */
const LAST_KEY = "pusula:quick-log:last";
type LastUsed = { subjectId: string; topicId: string | null };

function readLastUsed(): LastUsed | null {
  try {
    const raw = window.localStorage.getItem(LAST_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return null;
    const { subjectId, topicId } = parsed as Partial<LastUsed>;
    if (typeof subjectId !== "string") return null;
    return { subjectId, topicId: typeof topicId === "string" ? topicId : null };
  } catch {
    return null;
  }
}

function writeLastUsed(value: LastUsed) {
  try {
    window.localStorage.setItem(LAST_KEY, JSON.stringify(value));
  } catch {
    // Depolama kapalıysa sessizce geç; hatırlama isteğe bağlı bir kolaylık.
  }
}

/**
 * S2/S6 Hızlı kayıt: ders çipleri → konu (isteğe bağlı) → Doğru / Yanlış / Boş → süre.
 * Anlık özet "Toplam 40 · Net 30,00" (net kuralı şablondan). Form gönderimi Enter ile;
 * Esc diyalogu kapatır; çift gönderim `pending` + ref kilidiyle engellenir.
 */
export function QuickLogSheet({
  open,
  onOpenChange,
  studentId,
  options,
  initial,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studentId: string;
  options: QuickLogOptions;
  initial: QuickLogInitial | null;
}) {
  return (
    <ResponsiveSheet open={open} onOpenChange={onOpenChange}>
      {/* Telefonda panel kendisi kaymaz: gövde kayar, başlık ve Kaydet sabit (yapışık altbilgi). */}
      <ResponsiveSheetContent className="max-md:flex max-md:flex-col max-md:overflow-hidden sm:max-w-xl">
        <QuickLogForm
          studentId={studentId}
          options={options}
          initial={initial}
          onOpenChange={onOpenChange}
        />
      </ResponsiveSheetContent>
    </ResponsiveSheet>
  );
}

function QuickLogForm({
  studentId,
  options,
  initial,
  onOpenChange,
}: {
  studentId: string;
  options: QuickLogOptions;
  initial: QuickLogInitial | null;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const submitting = useRef(false);
  const editing = initial !== null;
  const todayKey = toDateKey(todayInIstanbul());

  // Son ders/konu: form yalnızca sheet açılınca (istemcide, kullanıcı etkileşimiyle) kurulduğu
  // için localStorage burada güvenle okunur; sunucuda hiç render edilmez (hidrasyon uyuşmazlığı
  // yok). Güncel seçeneklerde bulunmayan ders/konu yok sayılır.
  const [{ subjectId, topicId }, setSelection] = useState(() => {
    if (initial) return { subjectId: initial.subjectId, topicId: initial.topicId };
    const fallback = { subjectId: options.subjects[0]!.subjectId, topicId: null };
    if (typeof window === "undefined") return fallback;
    const last = readLastUsed();
    const subject = last && options.subjects.find((s) => s.subjectId === last.subjectId);
    if (!last || !subject) return fallback;
    return {
      subjectId: subject.subjectId,
      topicId: subject.topics.some((t) => t.topicId === last.topicId) ? last.topicId : null,
    };
  });
  const [correct, setCorrect] = useState(initial?.correct ?? 0);
  const [wrong, setWrong] = useState(initial?.wrong ?? 0);
  const [blank, setBlank] = useState(initial?.blank ?? 0);
  const [duration, setDuration] = useState(initial?.durationMinutes?.toString() ?? "");
  const [logDate, setLogDate] = useState(initial?.logDate ?? todayKey);
  const [error, setError] = useState<string>();
  const correctRef = useRef<HTMLInputElement>(null);

  const subject = options.subjects.find((s) => s.subjectId === subjectId) ?? options.subjects[0]!;
  const total = correct + wrong + blank;
  const net = calculateNet({ correct, wrong, wrongPenalty: options.wrongPenalty });

  function selectSubject(id: string) {
    setSelection({ subjectId: id, topicId: null });
  }
  function selectTopic(id: string | null) {
    setSelection({ subjectId, topicId: id });
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    if (submitting.current || pending) return;
    setError(undefined);

    const base = {
      studentId,
      subjectId,
      topicId,
      correct,
      wrong,
      blank,
      durationMinutes: duration.trim() === "" ? null : Number(duration),
    };
    const parsed = editing
      ? updateQuestionLogSchema.safeParse({ ...base, id: initial.id, logDate })
      : createQuestionLogSchema.safeParse(base);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Formu kontrol et.");
      return;
    }

    submitting.current = true;
    startTransition(async () => {
      try {
        const result = editing
          ? await updateQuestionLog({ ...base, id: initial.id, logDate })
          : await createQuestionLog(base);
        if (!result.ok) {
          setError(result.error);
          return;
        }
        writeLastUsed({ subjectId, topicId });
        toast.success(editing ? "Kayıt güncellendi." : saveToastMessage(result.data));
        onOpenChange(false);
        router.refresh();
      } finally {
        submitting.current = false;
      }
    });
  }

  return (
    <form
      onSubmit={submit}
      className="flex min-h-0 flex-col gap-4 max-md:flex-1 md:gap-5"
      noValidate
    >
      <ResponsiveSheetHeader className="shrink-0">
        <ResponsiveSheetTitle>{editing ? "Kaydı düzenle" : "Soru kaydı"}</ResponsiveSheetTitle>
        <ResponsiveSheetDescription>
          {editing
            ? "Sayıları veya tarihi değiştir, kaydet."
            : `${formatDateTr(todayInIstanbul(), { weekday: true })} · dersi seç, sayıları gir, kaydet.`}
        </ResponsiveSheetDescription>
      </ResponsiveSheetHeader>

      {/* Kayan gövde (yalnızca telefonda kayar; kenar boşluğu panelinkiyle hizalı). */}
      <div
        data-testid="quick-log-body"
        className="flex min-h-0 flex-col gap-4 max-md:-mx-4 max-md:flex-1 max-md:overflow-y-auto max-md:px-4 md:gap-5 clay:max-md:-mx-5 clay:max-md:px-5"
      >
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 text-small font-medium text-ink-700">Ders</legend>
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Ders">
            {options.subjects.map((s) => {
              const selected = s.subjectId === subjectId;
              return (
                <button
                  key={s.subjectId}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => selectSubject(s.subjectId)}
                  style={subjectVars(s.color)}
                  className={cn(
                    "flex min-h-11 items-center gap-2 rounded-xs border px-3 text-small font-medium",
                    selected
                      ? "border-subject bg-subject-soft text-subject-ink"
                      : "border-line bg-bg-paper text-ink-700 hover:bg-bg-surface",
                    "clay:min-h-12 clay:clay-press clay:rounded-md clay:border-0 clay:px-4",
                    selected ? "clay:clay-pressed clay:bg-subject-soft" : "clay:clay-sm",
                  )}
                >
                  <span aria-hidden="true" className="size-2 rounded-full bg-subject" />
                  {s.shortName}
                </button>
              );
            })}
          </div>
        </fieldset>

        <div>
          <Label htmlFor="quick-log-topic">Konu (isteğe bağlı)</Label>
          <NativeSelect
            id="quick-log-topic"
            value={topicId ?? ""}
            onChange={(e) => selectTopic(e.target.value === "" ? null : e.target.value)}
          >
            <option value="">Konu seçmeden kaydet</option>
            {subject.topics.map((t) => (
              <option key={t.topicId} value={t.topicId}>
                {t.name}
              </option>
            ))}
          </NativeSelect>
        </div>

        {/* Telefonda alt alta üç satır (etiket solda, − sayı + sağda); ≥ md üç sütun. */}
        <div className="grid gap-2 md:grid-cols-3 md:gap-3">
          <NumberStepper
            id="quick-log-correct"
            label="Doğru"
            value={correct}
            onChange={setCorrect}
            inputRef={correctRef}
          />
          <NumberStepper id="quick-log-wrong" label="Yanlış" value={wrong} onChange={setWrong} />
          <NumberStepper id="quick-log-blank" label="Boş" value={blank} onChange={setBlank} />
        </div>

        {/* Süre kompakt: telefonda adımlayıcılarla aynı satır düzeni (etiket solda, alan sağda). */}
        <div className={cn("grid gap-2 md:gap-4", editing ? "md:grid-cols-2" : "")}>
          <div className="flex items-center justify-between gap-3 md:flex-col md:items-stretch md:gap-0">
            <Label htmlFor="quick-log-duration" className="mb-0 md:mb-1.5 clay:mb-0 md:clay:mb-2">
              Süre (dk, isteğe bağlı)
            </Label>
            <Input
              id="quick-log-duration"
              type="number"
              inputMode="numeric"
              min={1}
              max={600}
              placeholder="ör. 40"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              className="w-28 shrink-0 md:w-full clay:min-h-11 md:clay:min-h-12"
            />
          </div>
          {editing ? (
            <div className="flex items-center justify-between gap-3 md:flex-col md:items-stretch md:gap-0">
              <Label htmlFor="quick-log-date" className="mb-0 md:mb-1.5 clay:mb-0 md:clay:mb-2">
                Tarih
              </Label>
              <Input
                id="quick-log-date"
                type="date"
                max={todayKey}
                value={logDate}
                onChange={(e) => setLogDate(e.target.value)}
                className="w-44 shrink-0 md:w-full clay:min-h-11 md:clay:min-h-12"
              />
            </div>
          ) : null}
        </div>

        <FormError message={error} />
      </div>

      {/* Yapışık altbilgi: anlık özet + Kaydet her zaman görünür; telefonda Vazgeç yok (X yeterli). */}
      <div className="flex shrink-0 flex-col gap-3">
        <p
          aria-live="polite"
          className="flex items-center justify-between rounded-sm bg-bg-surface px-4 py-2.5 text-small clay:rounded-md clay:clay-well"
        >
          <span className="text-ink-500">Anlık özet</span>
          <span className="font-semibold text-ink-900">
            {`Toplam ${total} · Net ${formatNet(net)}`}
          </span>
        </p>
        <ResponsiveSheetFooter>
          <Button
            type="button"
            variant="secondary"
            onClick={() => onOpenChange(false)}
            className="max-md:hidden"
          >
            Vazgeç
          </Button>
          <Button type="submit" disabled={pending}>
            {pending ? "Kaydediliyor…" : "Kaydet"}
          </Button>
        </ResponsiveSheetFooter>
      </div>
      <p className="hidden text-center text-micro-lg text-ink-500 md:block">
        <kbd>Tab</kbd> alanlar arasında geçer · <kbd>↑</kbd> <kbd>↓</kbd> sayıyı değiştirir ·{" "}
        <kbd>Enter</kbd> kaydeder · <kbd>Esc</kbd> kapatır
      </p>
    </form>
  );
}
