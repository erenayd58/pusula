"use client";

import { useRouter } from "next/navigation";
import { useMemo, useRef, useState, useTransition, type FormEvent } from "react";
import { toast } from "sonner";
import { FormError } from "@/components/shared/form-error";
import { subjectVars } from "@/components/shared/subject-scope";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { mockExamKindLabels } from "@/content/labels";
import { autoBlank, totalNet } from "@/lib/exam/mock";
import { calculateNet } from "@/lib/exam/net";
import { formatCount, formatDateTr, formatNet } from "@/lib/format";
import { cn } from "@/lib/utils";
import { saveMockResultSchema, type SaveMockResultInput } from "../schemas";
import { saveMockResult } from "../server/actions";
import type { MockOptions, MockResultDetail, MockSubject } from "../types";
import { SubjectEntryRow, type SubjectEntry } from "./subject-entry-row";
import { TopicMarkStep } from "./topic-mark-step";

type Step = 1 | 2 | 3;
type Custom = { title: string; kind: "general" | "branch"; subjectId: string | null };
type Optional = { duration: string; score: string; percentile: string; note: string };

const STEP_TITLES: Record<Step, string> = { 1: "Deneme", 2: "Netler", 3: "Yanlış konular" };

const asNumber = (v: string): number | null => {
  const t = v.trim().replace(",", ".");
  if (t === "") return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : Number.NaN;
};

/**
 * Deneme giriş sihirbazı (10 §2 Parça 1; hedef 3 dk). 1. Deneme: katalog listesi ("Girildi"
 * rozetiyle devre dışı) ya da "Başka bir deneme" (başlık + Genel / Sadece bir ders), tarih,
 * isteğe bağlı süre / puan / yüzdelik / not. 2. Netler: ders satırları (branşta tek), Boş otomatik
 * (karar C4), altta yapışkan özet. 3. Yanlış konular: yalnızca `wrong > 0` derslerin konuları;
 * "Atla" ve "Kaydet". Kaydet → RPC → detay + toast. Koç aynı sihirbazı `compact` kullanır
 * (öğrenci adına giriş, düzenleme). Klavye: Enter sonraki adım, Esc vazgeç. Yerel taslak yok.
 */
export function ResultWizard({
  studentId,
  audience,
  options,
  initial,
  preselectExamId,
  basePath,
}: {
  studentId: string;
  audience: "student" | "coach";
  options: MockOptions;
  initial: MockResultDetail | null;
  preselectExamId: string | null;
  basePath: string;
}) {
  const router = useRouter();
  const compact = audience === "coach";
  const [pending, startTransition] = useTransition();
  const submitting = useRef(false);
  const firstNetRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<Step>(1);
  const [error, setError] = useState<string>();

  const preselect = preselectExamId
    ? options.exams.find((e) => e.id === preselectExamId && e.enteredResultId === null)
    : undefined;
  const [examId, setExamId] = useState<string | null>(initial?.mockExamId ?? preselect?.id ?? null);
  const [custom, setCustom] = useState<Custom>({
    title: initial?.customTitle ?? "",
    kind: initial?.subjectId ? "branch" : "general",
    subjectId: initial?.subjectId ?? null,
  });
  const [customOn, setCustomOn] = useState(initial ? initial.mockExamId === null : false);
  const [takenOn, setTakenOn] = useState(initial?.takenOn ?? options.today);
  const [optional, setOptional] = useState<Optional>({
    duration: initial?.durationMinutes?.toString() ?? "",
    score: initial?.score?.toString() ?? "",
    percentile: initial?.percentile?.toString() ?? "",
    note: initial?.note ?? "",
  });
  const [entries, setEntries] = useState<Record<string, SubjectEntry>>(() => {
    const out: Record<string, SubjectEntry> = {};
    for (const s of initial?.subjects ?? []) {
      const auto = autoBlank(s.questionCount, s.correct, s.wrong);
      out[s.subjectId] = {
        correct: s.correct,
        wrong: s.wrong,
        blankManual: auto === s.blank ? null : s.blank,
      };
    }
    return out;
  });
  const [topics, setTopics] = useState<ReadonlySet<string>>(
    () => new Set(initial?.topics.map((t) => t.topicId) ?? []),
  );

  const selectedExam = examId ? options.exams.find((e) => e.id === examId) : undefined;
  const branchSubjectId = customOn
    ? custom.kind === "branch"
      ? custom.subjectId
      : null
    : (selectedExam?.subjectId ?? null);
  const rowSubjects: MockSubject[] = useMemo(
    () =>
      branchSubjectId
        ? options.subjects.filter((s) => s.subjectId === branchSubjectId)
        : options.subjects,
    [branchSubjectId, options.subjects],
  );

  const rows = rowSubjects.map((s) => {
    const entry = entries[s.subjectId] ?? { correct: 0, wrong: 0, blankManual: null };
    const auto = autoBlank(s.questionCount, entry.correct, entry.wrong);
    const blank = entry.blankManual ?? auto ?? 0;
    // Ders neti iki basamağa yuvarlanır (DB `numeric(6,2)` ile aynı); toplam yuvarlanmışların toplamı.
    const net =
      Math.round(
        calculateNet({
          correct: entry.correct,
          wrong: entry.wrong,
          wrongPenalty: options.wrongPenalty,
        }) * 100,
      ) / 100;
    const over = s.questionCount !== null && entry.correct + entry.wrong + blank > s.questionCount;
    return {
      subject: s,
      entry,
      blank,
      net,
      error: over ? `Bu derste ${formatCount(s.questionCount ?? 0, "soru")} var.` : null,
    };
  });
  const totalQuestions = rows.reduce((a, r) => a + r.entry.correct + r.entry.wrong + r.blank, 0);
  const total = totalNet(
    rows.map((r) => ({
      subjectId: r.subject.subjectId,
      correct: r.entry.correct,
      wrong: r.entry.wrong,
      blank: r.blank,
      net: r.net,
      questionCount: r.subject.questionCount,
    })),
  );
  const wrongBySubject = new Map(rows.map((r) => [r.subject.subjectId, r.entry.wrong]));
  const title = customOn ? custom.title.trim() : (selectedExam?.title ?? "");

  function validateStep1(): string | undefined {
    if (customOn) {
      if (custom.title.trim() === "") return "Deneme adı gir.";
      if (custom.kind === "branch" && !custom.subjectId) return "Branş denemesi için dersi seç.";
    } else if (!examId) {
      return "Listeden bir deneme seç ya da “Başka bir deneme” ile adını yaz.";
    }
    if (!takenOn) return "Tarih gir.";
    if (takenOn > options.today) return "Tarih bugünden sonra olamaz.";
    for (const [key, label] of [
      ["duration", "Süre"],
      ["score", "Puan"],
      ["percentile", "Yüzdelik"],
    ] as const) {
      if (Number.isNaN(asNumber(optional[key]))) return `${label} sayı olmalı.`;
    }
    return undefined;
  }

  function buildInput(topicIds: string[]): SaveMockResultInput | string {
    const raw = {
      id: initial?.id,
      studentId,
      mockExamId: customOn ? null : examId,
      customTitle: customOn ? custom.title : null,
      subjectId: customOn && custom.kind === "branch" ? custom.subjectId : null,
      takenOn,
      durationMinutes: asNumber(optional.duration),
      score: asNumber(optional.score),
      percentile: asNumber(optional.percentile),
      note: optional.note,
      subjects: rows.map((r) => ({
        subjectId: r.subject.subjectId,
        correct: r.entry.correct,
        wrong: r.entry.wrong,
        blank: r.blank,
      })),
      topicIds,
    };
    const parsed = saveMockResultSchema.safeParse(raw);
    return parsed.success ? parsed.data : (parsed.error.issues[0]?.message ?? "Formu kontrol et.");
  }

  function save(withTopics: boolean) {
    if (submitting.current || pending) return;
    setError(undefined);
    const input = buildInput(withTopics ? [...topics] : []);
    if (typeof input === "string") {
      setError(input);
      return;
    }
    submitting.current = true;
    startTransition(async () => {
      try {
        const result = await saveMockResult(input);
        if (!result.ok) {
          setError(result.error);
          return;
        }
        toast.success(
          initial
            ? `Deneme güncellendi. Toplam net ${formatNet(total)}.`
            : `Deneme kaydedildi. Toplam net ${formatNet(total)}.`,
        );
        router.push(`${basePath}/${result.data.id}`);
        router.refresh();
      } finally {
        submitting.current = false;
      }
    });
  }

  function next(e: FormEvent) {
    e.preventDefault();
    setError(undefined);
    if (step === 1) {
      const msg = validateStep1();
      if (msg) {
        setError(msg);
        return;
      }
      setStep(2);
      setTimeout(() => firstNetRef.current?.focus(), 0);
      return;
    }
    if (step === 2) {
      if (rows.some((r) => r.error)) {
        setError("Bir derste doğru + yanlış + boş soru sayısını aşıyor.");
        return;
      }
      setStep(3);
      return;
    }
    save(true);
  }

  function cancel() {
    router.push(initial ? `${basePath}/${initial.id}` : basePath);
  }

  const stickyFooter = cn(
    "sticky z-10 flex flex-col gap-3 border-t border-line bg-bg-app/95 pt-3 backdrop-blur-sm",
    compact ? "bottom-0 bg-bg-paper/95" : "bottom-24 lg:bottom-4",
  );

  return (
    <form
      onSubmit={next}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.preventDefault();
          cancel();
        }
      }}
      className="flex flex-col gap-5"
      noValidate
      data-testid="result-wizard"
    >
      <ol className="flex items-center gap-2 text-micro-lg text-ink-500" aria-label="Adımlar">
        {([1, 2, 3] as const).map((s) => (
          <li
            key={s}
            aria-current={s === step ? "step" : undefined}
            className={cn(
              "flex items-center gap-1.5",
              s === step ? "font-semibold text-ink-900" : undefined,
            )}
          >
            <span
              aria-hidden="true"
              className={cn(
                "flex size-6 items-center justify-center rounded-pill border text-micro",
                s === step
                  ? "border-ink-900 bg-ink-900 text-bg-paper"
                  : s < step
                    ? "border-ink-900 text-ink-900"
                    : "border-line text-ink-500",
              )}
            >
              {s}
            </span>
            <span className={compact ? undefined : "sr-only sm:not-sr-only"}>{STEP_TITLES[s]}</span>
          </li>
        ))}
      </ol>

      {step === 1 ? (
        <div className="flex flex-col gap-5">
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-2 text-small font-medium text-ink-700">Deneme</legend>
            {options.exams.length === 0 ? (
              <p className="text-small text-ink-500">
                Katalogda deneme yok; adını yazarak ekleyebilirsin.
              </p>
            ) : null}
            <ul className="flex flex-col gap-2" role="radiogroup" aria-label="Katalog denemeleri">
              {options.exams.map((e) => {
                const entered = e.enteredResultId !== null && e.enteredResultId !== initial?.id;
                const selected = !customOn && examId === e.id;
                return (
                  <li key={e.id}>
                    <button
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      disabled={entered}
                      onClick={() => {
                        setCustomOn(false);
                        setExamId(e.id);
                      }}
                      className={cn(
                        "flex min-h-11 w-full items-center justify-between gap-3 rounded-sm border px-3 py-2 text-left text-small",
                        selected
                          ? "border-ink-900 bg-bg-surface"
                          : "border-line bg-bg-paper hover:bg-bg-surface",
                        "disabled:cursor-not-allowed disabled:text-ink-500",
                        "clay:rounded-md clay:border-0 clay:px-4 clay:py-3",
                        selected ? "clay:clay-pressed" : "clay:clay-sm clay:bg-bg-raised",
                      )}
                    >
                      <span className="flex min-w-0 flex-col">
                        <span className="truncate font-medium">{e.title}</span>
                        <span className="text-micro-lg text-ink-500">
                          {[e.publisher, e.examDate ? formatDateTr(e.examDate) : null]
                            .filter(Boolean)
                            .join(" · ")}
                        </span>
                      </span>
                      <span className="flex shrink-0 items-center gap-2">
                        <Badge>
                          {e.subjectId
                            ? `${mockExamKindLabels.branch} · ${e.subjectShortName ?? ""}`
                            : mockExamKindLabels.general}
                        </Badge>
                        {entered ? <Badge tone="success">Girildi</Badge> : null}
                      </span>
                    </button>
                  </li>
                );
              })}
              <li>
                <button
                  type="button"
                  role="radio"
                  aria-checked={customOn}
                  onClick={() => {
                    setCustomOn(true);
                    setExamId(null);
                  }}
                  className={cn(
                    "flex min-h-11 w-full items-center rounded-sm border px-3 py-2 text-left text-small font-medium",
                    customOn
                      ? "border-ink-900 bg-bg-surface"
                      : "border-line bg-bg-paper hover:bg-bg-surface",
                    "clay:rounded-md clay:border-0 clay:px-4 clay:py-3",
                    customOn ? "clay:clay-pressed" : "clay:clay-sm clay:bg-bg-raised",
                  )}
                >
                  Başka bir deneme
                </button>
              </li>
            </ul>
          </fieldset>

          {customOn ? (
            <div className="flex flex-col gap-4">
              <div>
                <Label htmlFor="mock-title">Deneme adı</Label>
                <Input
                  id="mock-title"
                  maxLength={80}
                  placeholder="ör. Kafa Dengi Türkiye Geneli 3"
                  value={custom.title}
                  onChange={(e) => setCustom({ ...custom, title: e.target.value })}
                />
              </div>
              <fieldset className="flex flex-col gap-2">
                <legend className="mb-2 text-small font-medium text-ink-700">Tür</legend>
                <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Tür">
                  {(["general", "branch"] as const).map((kind) => (
                    <button
                      key={kind}
                      type="button"
                      role="radio"
                      aria-checked={custom.kind === kind}
                      onClick={() => setCustom({ ...custom, kind })}
                      className={cn(
                        "min-h-11 rounded-xs border px-3 text-small font-medium",
                        custom.kind === kind
                          ? "border-ink-900 bg-bg-surface text-ink-900"
                          : "border-line bg-bg-paper text-ink-700 hover:bg-bg-surface",
                        "clay:min-h-12 clay:clay-press clay:rounded-md clay:border-0 clay:px-4",
                        custom.kind === kind
                          ? "clay:clay-pressed"
                          : "clay:clay-sm clay:bg-bg-raised",
                      )}
                    >
                      {kind === "general" ? "Genel" : "Sadece bir ders"}
                    </button>
                  ))}
                </div>
              </fieldset>
              {custom.kind === "branch" ? (
                <fieldset className="flex flex-col gap-2">
                  <legend className="mb-2 text-small font-medium text-ink-700">Ders</legend>
                  <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Ders">
                    {options.subjects.map((s) => {
                      const on = custom.subjectId === s.subjectId;
                      return (
                        <button
                          key={s.subjectId}
                          type="button"
                          role="radio"
                          aria-checked={on}
                          onClick={() => setCustom({ ...custom, subjectId: s.subjectId })}
                          style={subjectVars(s.color)}
                          className={cn(
                            "flex min-h-11 items-center gap-2 rounded-xs border px-3 text-small font-medium",
                            on
                              ? "border-subject bg-subject-soft text-subject-ink"
                              : "border-line bg-bg-paper text-ink-700 hover:bg-bg-surface",
                            "clay:min-h-12 clay:clay-press clay:rounded-md clay:border-0 clay:px-4",
                            on
                              ? "clay:clay-pressed clay:bg-subject-soft"
                              : "clay:clay-sm clay:bg-bg-raised",
                          )}
                        >
                          <span aria-hidden="true" className="size-2 rounded-full bg-subject" />
                          {s.shortName}
                        </button>
                      );
                    })}
                  </div>
                </fieldset>
              ) : null}
            </div>
          ) : null}

          <div className="max-w-xs">
            <Label htmlFor="mock-taken-on">Tarih</Label>
            <Input
              id="mock-taken-on"
              type="date"
              max={options.today}
              value={takenOn}
              onChange={(e) => setTakenOn(e.target.value)}
            />
          </div>

          <details className="group rounded-sm border border-line bg-bg-paper clay:rounded-card clay:border-0 clay:clay-sm clay:bg-bg-raised">
            <summary className="cursor-pointer list-none px-4 py-3 text-small font-medium text-ink-900 select-none">
              İsteğe bağlı: süre, puan, yüzdelik, not
            </summary>
            <div className="grid gap-4 px-4 pb-4 sm:grid-cols-3">
              <div>
                <Label htmlFor="mock-duration">Süre (dk)</Label>
                <Input
                  id="mock-duration"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={600}
                  value={optional.duration}
                  onChange={(e) => setOptional({ ...optional, duration: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="mock-score">Puan</Label>
                <Input
                  id="mock-score"
                  type="text"
                  inputMode="decimal"
                  placeholder="yayınevinin puanı"
                  value={optional.score}
                  onChange={(e) => setOptional({ ...optional, score: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="mock-percentile">Yüzdelik</Label>
                <Input
                  id="mock-percentile"
                  type="text"
                  inputMode="decimal"
                  placeholder="0–100"
                  value={optional.percentile}
                  onChange={(e) => setOptional({ ...optional, percentile: e.target.value })}
                />
              </div>
              <div className="sm:col-span-3">
                <Label htmlFor="mock-note">Not</Label>
                <Input
                  id="mock-note"
                  maxLength={300}
                  placeholder="ör. Fen'de süre yetmedi"
                  value={optional.note}
                  onChange={(e) => setOptional({ ...optional, note: e.target.value })}
                />
              </div>
            </div>
          </details>
        </div>
      ) : null}

      {step === 2 ? (
        <div className="flex flex-col gap-3">
          <p className="text-small text-ink-500">
            {`${title} · ${formatDateTr(takenOn)} · Doğru ve yanlışı gir; boş kendiliğinden hesaplanır.`}
          </p>
          <ul className="flex flex-col gap-3" aria-label="Ders netleri">
            {rows.map((r, i) => (
              <SubjectEntryRow
                key={r.subject.subjectId}
                subject={r.subject}
                entry={r.entry}
                blank={r.blank}
                net={r.net}
                error={r.error}
                compact={compact}
                firstInputRef={i === 0 ? firstNetRef : undefined}
                onChange={(next) =>
                  setEntries((prev) => ({ ...prev, [r.subject.subjectId]: next }))
                }
              />
            ))}
          </ul>
        </div>
      ) : null}

      {step === 3 ? (
        <div className="flex flex-col gap-3">
          <p className="text-small text-ink-500">
            Yanlış yaptığın konuları işaretle; koçun öneri yaparken bunlara bakar. İstersen atla.
          </p>
          <TopicMarkStep
            subjects={rowSubjects}
            wrongBySubject={wrongBySubject}
            selected={topics}
            onToggle={(id) =>
              setTopics((prev) => {
                const next = new Set(prev);
                if (next.has(id)) next.delete(id);
                else next.add(id);
                return next;
              })
            }
          />
        </div>
      ) : null}

      <FormError message={error} />

      <div className={stickyFooter}>
        {step >= 2 ? (
          <p
            aria-live="polite"
            data-testid="wizard-summary"
            className="flex items-center justify-between rounded-sm bg-bg-surface px-4 py-2.5 text-small clay:rounded-md clay:clay-well"
          >
            <span className="text-ink-500">
              {step === 2 ? "Anlık özet" : `${formatCount(topics.size, "konu")} işaretli`}
            </span>
            <span className="font-semibold text-ink-900 tabular-nums">
              {`Toplam ${formatCount(totalQuestions, "soru")} · Net ${formatNet(total)}`}
            </span>
          </p>
        ) : null}
        <div className="flex flex-wrap justify-end gap-2">
          {step === 1 ? (
            <Button type="button" variant="secondary" onClick={cancel}>
              Vazgeç
            </Button>
          ) : (
            <Button
              type="button"
              variant="secondary"
              onClick={() => setStep((s) => (s === 3 ? 2 : 1))}
              disabled={pending}
            >
              Geri
            </Button>
          )}
          {step === 3 ? (
            <Button
              type="button"
              variant="secondary"
              onClick={() => save(false)}
              disabled={pending}
            >
              Atla
            </Button>
          ) : null}
          <Button type="submit" disabled={pending}>
            {step === 3 ? (pending ? "Kaydediliyor…" : "Kaydet") : "Devam"}
          </Button>
        </div>
        <p className="hidden text-center text-micro-lg text-ink-500 md:block">
          <kbd>Tab</kbd> alanlar · <kbd>↑</kbd> <kbd>↓</kbd> sayı · <kbd>Enter</kbd> sonraki adım ·{" "}
          <kbd>Esc</kbd> vazgeç
        </p>
      </div>
    </form>
  );
}
