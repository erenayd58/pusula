"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { InfoIcon } from "lucide-react";
import { toast } from "sonner";
import { FieldError } from "@/components/shared/field-error";
import { FormError } from "@/components/shared/form-error";
import { SubjectBadge } from "@/components/shared/subject-badge";
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
import { daysSince, weekStart } from "@/lib/dates";
import { formatCount, formatWeekRange } from "@/lib/format";
import { backPlanTopics, type TopicTargetDate } from "@/lib/strategy/back-plan";
import { feasibility, feasibilityText } from "@/lib/strategy/feasibility";
import { splitQuestions } from "@/lib/strategy/split";
import { setStudentTargetsSchema, type SetStudentTargetsInput } from "../schemas";
import { setStudentTargets } from "../server/actions";
import type { FeasibilityBase, StudentTargets } from "../types";

/** Sayı alanı: boş → 0 (şema ≥ 0), virgül/nokta yok sayılır. */
const asInt = (v: unknown) => {
  if (typeof v === "number") return v;
  const n = Number(String(v ?? "").trim());
  return Number.isFinite(n) ? Math.floor(n) : NaN;
};

/**
 * Hedef formu (Faz 5b, 09 §2 Parça 2; koç flat): "Konuları bitirme tarihi" (varsayılan sınav −
 * `topics_finish_weeks_before_exam` hafta, karar B16; sınav tarihi yoksa kaydet kapalı),
 * "Başlangıç" (varsayılan bugün), "Toplam soru" + ders satırları (`splitQuestions`; toplam türetilir),
 * canlı gerçekçilik cümlesi (nötr, bilgi ikonu). "Takvimi oluştur ve kaydet" → `backPlanTopics`
 * istemcide → önizleme → onayla RPC. Mevcut hedef varsa yeniden üretim uyarısı (karar B4).
 */
export function TargetForm({
  targets,
  defaultFinishBy,
  today,
  feasibilityBase,
}: {
  targets: StudentTargets;
  /** `exam_date − topics_finish_weeks_before_exam` hafta; sınav tarihi yoksa null. */
  defaultFinishBy: string | null;
  today: string;
  feasibilityBase: FeasibilityBase;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string>();
  const [preview, setPreview] = useState<TopicTargetDate[] | null>(null);
  const hasTargets = targets.topicsFinishBy !== null;

  const form = useForm<SetStudentTargetsInput>({
    resolver: zodResolver(setStudentTargetsSchema),
    defaultValues: {
      studentId: targets.studentId,
      topicsFinishBy: targets.topicsFinishBy ?? defaultFinishBy ?? "",
      startsOn: targets.targetStartsOn ?? today,
      subjects: targets.subjects.map((s) => ({
        subjectId: s.subjectId,
        questions: s.questions ?? 0,
      })),
      topics: [],
    },
  });
  const { fields } = useFieldArray({ control: form.control, name: "subjects" });
  const { errors } = form.formState;
  const subjects = useWatch({ control: form.control, name: "subjects" });
  const finishBy = useWatch({ control: form.control, name: "topicsFinishBy" });
  const total = subjects.reduce(
    (sum, s) => sum + (Number.isFinite(s.questions) ? s.questions : 0),
    0,
  );

  function setTotal(next: number) {
    const split = splitQuestions(next, targets.subjects);
    split.forEach((s, i) =>
      form.setValue(`subjects.${i}.questions`, s.questions, { shouldDirty: true }),
    );
  }

  const feasible = useMemo(() => {
    const daysToFinish = finishBy ? -daysSince(finishBy, today) : 0;
    return feasibility({
      remainingTopicMinutes: feasibilityBase.remainingTopicMinutes,
      weeksToFinish: daysToFinish / 7,
      remainingQuestions: total - feasibilityBase.questionsDone,
      minutesPerQuestion: feasibilityBase.minutesPerQuestion,
      weeksToExam: feasibilityBase.weeksToExam,
      weeklyAvailableMinutes: feasibilityBase.weeklyAvailableMinutes,
    });
  }, [finishBy, today, total, feasibilityBase]);

  const openPreview = form.handleSubmit((values) => {
    setFormError(undefined);
    const plan = backPlanTopics({
      topics: targets.topics.map((t) => ({
        topicId: t.topicId,
        subjectId: t.subjectId,
        subjectSortOrder: t.subjectSortOrder,
        topicSortOrder: t.sortOrder,
        schoolFinishOn: t.schoolFinishOn,
        done: t.done,
      })),
      startsOn: values.startsOn,
      finishBy: values.topicsFinishBy,
    });
    setPreview(plan);
  });

  function confirm() {
    if (!preview) return;
    const values = form.getValues();
    startTransition(async () => {
      const result = await setStudentTargets({ ...values, topics: preview });
      if (!result.ok) {
        setPreview(null);
        setFormError(result.fieldErrors?.topicsFinishBy?.[0] ?? result.error);
        return;
      }
      setPreview(null);
      toast.success(
        `Hedef kaydedildi: ${formatCount(result.data.topics, "konu")} takvime yerleşti.`,
      );
      form.reset({ ...values, topics: [] });
      router.refresh();
    });
  }

  const noExam = targets.examDate === null;
  const topicName = new Map(targets.topics.map((t) => [t.topicId, t]));
  const subjectOf = new Map(targets.subjects.map((s) => [s.subjectId, s]));

  return (
    <>
      <form onSubmit={openPreview} className="flex flex-col gap-5" noValidate>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="target-finish-by">Konuları bitirme tarihi</Label>
            <Input
              id="target-finish-by"
              type="date"
              disabled={noExam}
              aria-invalid={!!errors.topicsFinishBy}
              aria-describedby="target-finish-by-hint"
              {...form.register("topicsFinishBy")}
            />
            <p id="target-finish-by-hint" className="mt-1 text-micro-lg text-ink-500">
              {noExam
                ? "Önce sınav tarihini gir (Genel bakış → Sınav)."
                : "Varsayılan: sınavdan önce tekrar ve deneme payı bırakır."}
            </p>
            <FieldError message={errors.topicsFinishBy?.message} />
          </div>
          <div>
            <Label htmlFor="target-starts-on">Başlangıç</Label>
            <Input
              id="target-starts-on"
              type="date"
              aria-invalid={!!errors.startsOn}
              {...form.register("startsOn")}
            />
            <p className="mt-1 text-micro-lg text-ink-500">
              Gerçekleşen sorular bu günden itibaren sayılır.
            </p>
            <FieldError message={errors.startsOn?.message} />
          </div>
        </div>

        <fieldset className="flex flex-col gap-3">
          <legend className="text-small font-medium text-ink-700">Sınava kadar soru hedefi</legend>
          <div className="max-w-xs">
            <Label htmlFor="target-total">Toplam soru</Label>
            <Input
              id="target-total"
              type="number"
              inputMode="numeric"
              min={0}
              value={total}
              onChange={(e) => setTotal(asInt(e.target.value) || 0)}
              aria-describedby="target-total-hint"
            />
            <p id="target-total-hint" className="mt-1 text-micro-lg text-ink-500">
              Derslere sınav soru sayısına göre dağıtılır; ders alanını elle değiştirebilirsin.
            </p>
            <FieldError message={errors.subjects?.message ?? errors.subjects?.root?.message} />
          </div>
          <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3" aria-label="Ders hedefleri">
            {fields.map((field, i) => {
              const subject = targets.subjects[i]!;
              const id = `target-subject-${subject.subjectId}`;
              return (
                <li
                  key={field.id}
                  className="flex items-center gap-3 rounded-sm border border-line px-3 py-2"
                >
                  <SubjectBadge color={subject.color} shortName={subject.shortName} />
                  <Label htmlFor={id} className="min-w-0 flex-1 truncate font-normal">
                    {subject.name}
                  </Label>
                  <Input
                    id={id}
                    type="number"
                    inputMode="numeric"
                    min={0}
                    className="w-24 text-right"
                    aria-invalid={!!errors.subjects?.[i]?.questions}
                    {...form.register(`subjects.${i}.questions`, { setValueAs: asInt })}
                  />
                </li>
              );
            })}
          </ul>
        </fieldset>

        <p
          data-testid="feasibility"
          className="flex items-start gap-2 rounded-sm border border-line bg-bg-surface px-4 py-3 text-small text-ink-700"
        >
          <InfoIcon aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          <span>{feasibilityText(feasible)}</span>
        </p>

        <FormError message={formError} />
        <div className="flex flex-wrap gap-2">
          <Button type="submit" disabled={pending || noExam}>
            {hasTargets ? "Takvimi yeniden oluştur ve kaydet" : "Takvimi oluştur ve kaydet"}
          </Button>
        </div>
      </form>

      <ResponsiveSheet open={preview !== null} onOpenChange={(open) => !open && setPreview(null)}>
        <ResponsiveSheetContent className="sm:max-w-lg">
          <ResponsiveSheetHeader>
            <ResponsiveSheetTitle>
              {hasTargets ? "Yeniden oluştur" : "Konu takvimi önizlemesi"}
            </ResponsiveSheetTitle>
            <ResponsiveSheetDescription>
              {hasTargets
                ? "Konu tarihleri yeniden dağıtılacak; elle değiştirdiklerin kaybolur."
                : `${formatCount(preview?.length ?? 0, "konu")} başlangıç ve bitiş arasına eşit yayılır; sonra tek tek düzenleyebilirsin.`}
            </ResponsiveSheetDescription>
          </ResponsiveSheetHeader>
          {preview && preview.length > 0 ? (
            <ol
              className="max-h-80 overflow-y-auto rounded-sm border border-line text-small"
              aria-label="Önizleme"
            >
              {preview.map((p) => {
                const t = topicName.get(p.topicId);
                const s = t ? subjectOf.get(t.subjectId) : undefined;
                return (
                  <li
                    key={p.topicId}
                    className="flex items-center gap-2 border-b border-line px-3 py-1.5 last:border-b-0"
                  >
                    {s ? <SubjectBadge color={s.color} shortName={s.shortName} /> : null}
                    <span className="min-w-0 flex-1 truncate text-ink-900">
                      {t?.name ?? "Konu"}
                    </span>
                    <span className="shrink-0 text-ink-500">
                      {formatWeekRange(weekStart(p.targetOn))}
                    </span>
                  </li>
                );
              })}
            </ol>
          ) : (
            <p className="text-small text-ink-700">
              Bitmemiş konu yok; yalnızca soru hedefi kaydedilir.
            </p>
          )}
          <ResponsiveSheetFooter>
            <Button type="button" variant="secondary" onClick={() => setPreview(null)}>
              Vazgeç
            </Button>
            <Button type="button" onClick={confirm} disabled={pending}>
              {pending ? "Kaydediliyor…" : "Kaydet"}
            </Button>
          </ResponsiveSheetFooter>
        </ResponsiveSheetContent>
      </ResponsiveSheet>
    </>
  );
}
