"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { FieldError } from "@/components/shared/field-error";
import { FormError } from "@/components/shared/form-error";
import { NativeSelect } from "@/components/shared/native-select";
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
import { dayOfWeekShortLabels, planItemKindLabels } from "@/content/labels";
import { cn } from "@/lib/utils";
import type { PlanItemKind } from "@/types";
import { estimateMinutes, type PlannerDefaults } from "../lib/estimate";
import { KIND_ORDER, KIND_SPECS } from "../lib/kinds";
import { taskTitle } from "@/lib/plan/task-title";
import { addPlanItemsSchema, updatePlanItemSchema } from "../schemas";
import { addPlanItems, updatePlanItem } from "../server/actions";
import type { PlanItem, PlanSubjectOption, TargetUnit, TaskPoolItem } from "../types";

export type PlanOptions = {
  subjects: PlanSubjectOption[];
  pace: Record<string, number>;
  defaults: PlannerDefaults;
};

/** Yeni görev: seçili günler (null = bu hafta içinde) ve isteğe bağlı havuz ön dolgusu. */
export type PlanItemFormState =
  | { mode: "add"; days: (number | null)[]; preset?: TaskPoolItem }
  | { mode: "edit"; item: PlanItem }
  | null;

const DAY_CHIPS: (number | null)[] = [1, 2, 3, 4, 5, 6, 7, null];

/** zod hatasını alan → mesaj listesine indirger (istemci tarafı; create-action sunucuya özel). */
function flattenIssues(error: { issues: { path: PropertyKey[]; message: string }[] }) {
  const out: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = issue.path.length ? issue.path.map(String).join(".") : "_form";
    (out[key] ??= []).push(issue.message);
  }
  return out;
}

/**
 * Görev formu (08 §2 Parça 2): tür, ders, konu, hedef, tahmini süre (öneri + düzenlenebilir),
 * bağlantı, başlık (boşsa otomatik), gün çipleri (ekleme modunda birden fazla gün).
 */
export function PlanItemForm({
  studentId,
  weekStart,
  options,
  state,
  onOpenChange,
}: {
  studentId: string;
  weekStart: string;
  options: PlanOptions;
  state: PlanItemFormState;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <ResponsiveSheet open={state !== null} onOpenChange={onOpenChange}>
      <ResponsiveSheetContent className="sm:max-w-lg">
        {state ? (
          <Fields
            key={state.mode === "edit" ? state.item.id : `add-${state.days.join("-")}`}
            studentId={studentId}
            weekStart={weekStart}
            options={options}
            state={state}
            onOpenChange={onOpenChange}
          />
        ) : null}
      </ResponsiveSheetContent>
    </ResponsiveSheet>
  );
}

function Fields({
  studentId,
  weekStart,
  options,
  state,
  onOpenChange,
}: {
  studentId: string;
  weekStart: string;
  options: PlanOptions;
  state: NonNullable<PlanItemFormState>;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const editing = state.mode === "edit";
  const initial = state.mode === "edit" ? state.item : (state.preset ?? null);

  const [kind, setKind] = useState<PlanItemKind>(initial?.kind ?? "questions");
  const [subjectId, setSubjectId] = useState<string | null>(
    initial?.subjectId ?? options.subjects[0]?.subjectId ?? null,
  );
  const [topicId, setTopicId] = useState<string | null>(initial?.topicId ?? null);
  const [target, setTarget] = useState<string>(
    initial?.targetValue?.toString() ?? (initial ? "" : String(options.defaults.questions_target)),
  );
  const [url, setUrl] = useState(initial?.url ?? "");
  const [title, setTitle] = useState(initial?.title ?? "");
  const [days, setDays] = useState<(number | null)[]>(state.mode === "add" ? state.days : []);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [formError, setFormError] = useState<string>();
  // Faz 7: kaynak testi / video bağı havuz ya da düzenlenen görevden gelir; formda seçilmez.
  const sectionId = initial?.sectionId ?? null;
  const videoId = initial?.videoId ?? null;
  const countsQuestions = kind === "questions" || kind === "section";

  const spec = KIND_SPECS[kind];
  const subject = options.subjects.find((s) => s.subjectId === subjectId) ?? null;
  const topic = subject?.topics.find((t) => t.topicId === topicId) ?? null;
  const targetValue = target.trim() === "" ? null : Number(target);
  const targetUnit: TargetUnit | null = spec.defaultTargetUnit;
  const suggested = estimateMinutes({
    kind,
    targetValue: countsQuestions ? targetValue : kind === "video" ? targetValue : null,
    pace:
      subjectId && options.pace[subjectId]
        ? { minutesPerQuestion: options.pace[subjectId]! }
        : null,
    defaults: options.defaults,
  });
  const [estimated, setEstimated] = useState<string>(
    initial?.estimatedMinutes?.toString() ?? String(suggested),
  );
  const [estimatedTouched, setEstimatedTouched] = useState(initial !== null);
  const effectiveEstimated = estimatedTouched ? estimated : String(suggested);
  const autoTitle = taskTitle({
    kind,
    subjectName: subject?.name ?? null,
    topicName: topic?.name ?? null,
    targetValue: kind === "questions" ? targetValue : null,
    targetUnit,
  });

  function changeKind(next: PlanItemKind) {
    setKind(next);
    if (next === "custom" || next === "link") setTopicId(null);
  }

  function submit() {
    setErrors({});
    setFormError(undefined);
    const common = {
      studentId,
      kind,
      title,
      subjectId: kind === "custom" || kind === "link" ? (subjectId ?? null) : subjectId,
      topicId: spec.needsTopic || countsQuestions || kind === "video" ? topicId : null,
      url: kind === "link" ? url : "",
      targetValue: countsQuestions || kind === "video" ? targetValue : null,
      targetUnit: countsQuestions ? "questions" : kind === "video" ? "minutes" : null,
      estimatedMinutes: effectiveEstimated.trim() === "" ? NaN : Number(effectiveEstimated),
      sectionId,
      videoId,
    };
    const parsed = editing
      ? updatePlanItemSchema.safeParse({ ...common, id: state.item.id })
      : addPlanItemsSchema.safeParse({ ...common, weekStart, days });
    if (!parsed.success) {
      setErrors(flattenIssues(parsed.error));
      return;
    }
    startTransition(async () => {
      const result = editing
        ? await updatePlanItem({ ...common, id: state.item.id })
        : await addPlanItems({ ...common, weekStart, days });
      if (!result.ok) {
        setFormError(result.error);
        if (result.fieldErrors) setErrors(result.fieldErrors);
        return;
      }
      toast.success(
        editing
          ? "Görev güncellendi."
          : days.length > 1
            ? `Görev ${days.length} güne eklendi.`
            : "Görev eklendi.",
      );
      onOpenChange(false);
      router.refresh();
    });
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className="flex flex-col gap-4"
      noValidate
    >
      <ResponsiveSheetHeader>
        <ResponsiveSheetTitle>{editing ? "Görevi düzenle" : "Görev ekle"}</ResponsiveSheetTitle>
        <ResponsiveSheetDescription>
          {editing
            ? "Tür, ders, hedef ve süreyi değiştirin."
            : "Birden fazla gün seçilirse aynı görev her güne ayrı ayrı eklenir."}
        </ResponsiveSheetDescription>
      </ResponsiveSheetHeader>

      {!editing ? (
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1.5 text-micro-lg text-ink-500">Günler</legend>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Günler">
            {DAY_CHIPS.map((d) => {
              const selected = days.includes(d);
              return (
                <label
                  key={String(d)}
                  className={cn(
                    "flex min-h-[38px] cursor-pointer items-center rounded-xs border px-3 text-small font-medium pointer-coarse:min-h-11",
                    selected
                      ? "border-ink-900 bg-ink-900 text-bg-paper"
                      : "border-line bg-bg-paper text-ink-700 hover:bg-bg-surface",
                    "has-focus-visible:outline-2 has-focus-visible:outline-focus",
                  )}
                >
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={selected}
                    onChange={(e) =>
                      setDays((prev) =>
                        e.target.checked ? [...prev, d] : prev.filter((x) => x !== d),
                      )
                    }
                  />
                  {d === null ? "Bu hafta içinde" : dayOfWeekShortLabels[d]}
                </label>
              );
            })}
          </div>
          <FieldError message={errors.days?.[0]} />
        </fieldset>
      ) : null}

      <div>
        <Label htmlFor="item-kind">Tür</Label>
        {kind === "section" || kind === "video" ? (
          // Bağlı tür: havuzdan/öneriden gelir, değiştirilmez (bağ kopmasın).
          <NativeSelect id="item-kind" value={kind} disabled>
            <option value={kind}>{planItemKindLabels[kind]}</option>
          </NativeSelect>
        ) : (
          <NativeSelect
            id="item-kind"
            value={kind}
            onChange={(e) => changeKind(e.target.value as PlanItemKind)}
          >
            {KIND_ORDER.map((k) => (
              <option key={k} value={k}>
                {planItemKindLabels[k]}
              </option>
            ))}
          </NativeSelect>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="item-subject">
            Ders{kind === "custom" || kind === "link" ? " (isteğe bağlı)" : ""}
          </Label>
          <NativeSelect
            id="item-subject"
            value={subjectId ?? ""}
            aria-invalid={!!errors.subjectId}
            onChange={(e) => {
              setSubjectId(e.target.value || null);
              setTopicId(null);
            }}
          >
            {kind === "custom" || kind === "link" ? <option value="">—</option> : null}
            {options.subjects.map((s) => (
              <option key={s.subjectId} value={s.subjectId}>
                {s.name}
              </option>
            ))}
          </NativeSelect>
          <FieldError message={errors.subjectId?.[0]} />
        </div>
        {kind !== "custom" && kind !== "link" ? (
          <div>
            <Label htmlFor="item-topic">Konu{countsQuestions ? " (isteğe bağlı)" : ""}</Label>
            <NativeSelect
              id="item-topic"
              value={topicId ?? ""}
              onChange={(e) => setTopicId(e.target.value || null)}
              disabled={!subject}
            >
              <option value="">{countsQuestions ? "Karışık" : "Konu seç"}</option>
              {subject?.topics.map((t) => (
                <option key={t.topicId} value={t.topicId}>
                  {t.name}
                </option>
              ))}
            </NativeSelect>
            <FieldError message={errors.topicId?.[0]} />
          </div>
        ) : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {countsQuestions ? (
          <div>
            <Label htmlFor="item-target">Soru sayısı</Label>
            <Input
              id="item-target"
              type="number"
              inputMode="numeric"
              min={1}
              max={500}
              value={target}
              aria-invalid={!!errors.targetValue}
              onChange={(e) => setTarget(e.target.value)}
            />
            <FieldError message={errors.targetValue?.[0]} />
          </div>
        ) : null}
        <div>
          <Label htmlFor="item-minutes">Tahmini süre (dk)</Label>
          <Input
            id="item-minutes"
            type="number"
            inputMode="numeric"
            min={1}
            max={600}
            value={effectiveEstimated}
            aria-invalid={!!errors.estimatedMinutes}
            onChange={(e) => {
              setEstimatedTouched(true);
              setEstimated(e.target.value);
            }}
          />
          <p className="mt-1 text-micro-lg text-ink-500">
            {countsQuestions && subjectId && options.pace[subjectId]
              ? `Öneri ${suggested} dk: öğrencinin bu dersteki temposu (son 60 gün).`
              : `Öneri ${suggested} dk: kurum varsayılanı.`}
          </p>
          <FieldError message={errors.estimatedMinutes?.[0]} />
        </div>
      </div>

      {kind === "link" ? (
        <div>
          <Label htmlFor="item-url">Bağlantı</Label>
          <Input
            id="item-url"
            type="url"
            placeholder="https://"
            value={url}
            aria-invalid={!!errors.url}
            onChange={(e) => setUrl(e.target.value)}
          />
          <FieldError message={errors.url?.[0]} />
        </div>
      ) : null}

      <div>
        <Label htmlFor="item-title">Başlık</Label>
        <Input
          id="item-title"
          maxLength={120}
          placeholder={autoTitle}
          value={title}
          aria-invalid={!!errors.title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <p className="mt-1 text-micro-lg text-ink-500">Boş bırakılırsa: “{autoTitle}”</p>
        <FieldError message={errors.title?.[0]} />
      </div>

      <FormError message={formError} />

      <ResponsiveSheetFooter>
        <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
          Vazgeç
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? "Kaydediliyor…" : editing ? "Kaydet" : "Görevi ekle"}
        </Button>
      </ResponsiveSheetFooter>
    </form>
  );
}
