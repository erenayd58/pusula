"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  useFieldArray,
  useForm,
  useWatch,
  type Control,
  type UseFormReturn,
} from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { PlusIcon, Trash2Icon } from "lucide-react";
import { toast } from "sonner";
import { FieldError } from "@/components/shared/field-error";
import { FormError } from "@/components/shared/form-error";
import { NativeSelect } from "@/components/shared/native-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { resourceTypeLabels } from "@/content/labels";
import { formatCount } from "@/lib/format";
import { similarTitles } from "@/lib/text/similar";
import { cn } from "@/lib/utils";
import { resourceFormSchema, resourceTypeValues, type ResourceFormInput } from "../schemas";
import { createResource, selfAssignResource, updateResource } from "../server/actions";
import type { CatalogTitle, ResourceDetail, ResourceOptions } from "../types";

/** "" → null, sayı metni → sayı (form alanları isteğe bağlı sayı). */
const asOptionalNumber = (v: unknown) => {
  if (typeof v === "number") return Number.isNaN(v) ? null : v;
  const s = String(v ?? "").trim();
  return s === "" ? null : Number(s.replace(",", "."));
};
const asNumber = (v: unknown) =>
  typeof v === "number"
    ? v
    : Number(
        String(v ?? "")
          .trim()
          .replace(",", "."),
      );

const TYPE_ORDER = resourceTypeValues;

/**
 * Kaynak formu (11 §2 Parça 1): ad (benzer ad önerisi), yayınevi, yıl, tür çipleri, ders çipi
 * (+ "Çok dersli"), test partileri ("Test 1–40, her biri 20 soru", sayfa isteğe bağlı; çok dersli
 * kitapta parti dersi). Kaydet → tek RPC. Öğrenci aynı formu clay yüzeyde kullanır; kaydettiğinde
 * kaynak kendisine atanmış olur. Düzenleme modunda yalnızca kitap alanları (testler editörde).
 */
export function ResourceForm({
  options,
  catalog,
  audience,
  basePath,
  resource,
}: {
  options: ResourceOptions;
  catalog: CatalogTitle[];
  audience: "student" | "coach";
  /** `/student/resources` ya da `/coach/resources`; kayıt sonrası `${basePath}/${id}`. */
  basePath: string;
  /** Düzenleme modu. */
  resource?: ResourceDetail;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string>();
  const editing = resource !== undefined;
  const form = useForm<ResourceFormInput>({
    resolver: zodResolver(resourceFormSchema),
    defaultValues: {
      id: resource?.id,
      templateId: resource?.templateId ?? options.templateId,
      title: resource?.title ?? "",
      publisher: resource?.publisher ?? "",
      publishYear: resource?.publishYear ?? null,
      type: resource?.type ?? "question_bank",
      subjectId: editing ? resource.subjectId : (options.subjects[0]?.subjectId ?? null),
      batches: editing
        ? []
        : [
            {
              prefix: "Test",
              from: 1,
              to: 20,
              questionCount: 20,
              pageStart: null,
              pagesPerSection: null,
              subjectId: null,
            },
          ],
    },
  });
  const { errors } = form.formState;
  const { fields, append, remove } = useFieldArray({ control: form.control, name: "batches" });
  const title = useWatch({ control: form.control, name: "title" }) ?? "";
  const subjectId = useWatch({ control: form.control, name: "subjectId" }) ?? null;
  const suggestions = editing ? [] : similarTitles(title, catalog);

  const onSubmit = form.handleSubmit((values) => {
    setFormError(undefined);
    startTransition(async () => {
      if (editing) {
        const result = await updateResource({ ...values, id: resource.id });
        if (!result.ok) {
          setFormError(result.error);
          return;
        }
        toast.success("Kaynak güncellendi.");
        router.push(`${basePath}/${resource.id}`);
        router.refresh();
        return;
      }
      const result = await createResource(values);
      if (!result.ok) {
        setFormError(result.error);
        return;
      }
      toast.success(
        `Kaynak kaydedildi: ${formatCount(result.data.sectionCount, "test")}.${audience === "student" ? " Listene eklendi." : ""}`,
      );
      router.push(`${basePath}/${result.data.id}`);
      router.refresh();
    });
  });

  function pickExisting(item: CatalogTitle) {
    if (audience === "coach") {
      router.push(`${basePath}/${item.id}`);
      return;
    }
    startTransition(async () => {
      const result = await selfAssignResource({ id: item.id });
      if (!result.ok) {
        setFormError(result.error);
        return;
      }
      toast.success(item.assigned ? "Bu kitap zaten listende." : "Kitap listene eklendi.");
      router.push(`${basePath}/${item.id}`);
      router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} className="flex max-w-3xl flex-col gap-6" noValidate>
      <BookFields form={form} options={options} />

      {suggestions.length > 0 ? (
        <div
          data-testid="resource-suggestions"
          className="flex flex-col gap-2 rounded-sm border border-line bg-bg-surface p-3 text-small clay:rounded-card clay:border-0 clay:clay-sm"
        >
          <p className="font-medium text-ink-900">Bunu mu demek istedin?</p>
          <ul className="flex flex-col gap-1.5">
            {suggestions.map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-3">
                <span className="min-w-0 truncate text-ink-700">
                  {s.title}
                  {s.publisher ? ` · ${s.publisher}` : ""}
                  {s.subjectShortName ? ` · ${s.subjectShortName}` : ""}
                </span>
                <Button
                  type="button"
                  variant="secondary"
                  disabled={pending}
                  onClick={() => pickExisting(s)}
                >
                  {audience === "student" ? (s.assigned ? "Aç" : "Seç") : "Aç"}
                </Button>
              </li>
            ))}
          </ul>
          <p className="text-micro-lg text-ink-500">
            Aynı kitap katalogda varsa onu seç; yeni bir kitap ekliyorsan devam et.
          </p>
        </div>
      ) : null}

      {editing ? null : (
        <fieldset className="flex flex-col gap-4">
          <legend className="mb-1 text-heading font-semibold text-ink-900">Testler</legend>
          <p className="text-small text-ink-500">
            Tek hamlede üret: numara aralığı ve her testin soru sayısı; sayfa isteğe bağlı. Konuya
            eşleme ve tek tek düzenleme kayıttan sonra.
          </p>
          {fields.map((f, index) => (
            <BatchFields
              key={f.id}
              index={index}
              control={form.control}
              form={form}
              multiSubject={subjectId === null}
              subjects={options.subjects}
              onRemove={fields.length > 1 ? () => remove(index) : undefined}
            />
          ))}
          <FieldError message={errors.batches?.message ?? errors.batches?.root?.message} />
          <div>
            <Button
              type="button"
              variant="secondary"
              onClick={() =>
                append({
                  prefix: "Test",
                  from: 1,
                  to: 10,
                  questionCount: 20,
                  pageStart: null,
                  pagesPerSection: null,
                  subjectId: null,
                })
              }
            >
              <PlusIcon aria-hidden="true" />
              Parti ekle
            </Button>
          </div>
        </fieldset>
      )}

      <FormError message={formError} />

      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Kaydediliyor…" : editing ? "Kaydet" : "Kaynağı kaydet"}
        </Button>
        <Button type="button" variant="secondary" asChild>
          <Link href={editing ? `${basePath}/${resource.id}` : basePath}>Vazgeç</Link>
        </Button>
      </div>
    </form>
  );
}

function BookFields({
  form,
  options,
}: {
  form: UseFormReturn<ResourceFormInput>;
  options: ResourceOptions;
}) {
  const e = form.formState.errors;
  const type = useWatch({ control: form.control, name: "type" });
  const subjectId = useWatch({ control: form.control, name: "subjectId" }) ?? null;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <Label htmlFor="resource-title">Kitap adı</Label>
        <Input
          id="resource-title"
          maxLength={120}
          placeholder="ör. Tonguç Matematik Soru Bankası"
          autoComplete="off"
          aria-invalid={!!e.title}
          {...form.register("title")}
        />
        <FieldError message={e.title?.message} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="resource-publisher">Yayınevi (isteğe bağlı)</Label>
          <Input
            id="resource-publisher"
            maxLength={60}
            aria-invalid={!!e.publisher}
            {...form.register("publisher")}
          />
          <FieldError message={e.publisher?.message} />
        </div>
        <div>
          <Label htmlFor="resource-year">Yıl (isteğe bağlı)</Label>
          <Input
            id="resource-year"
            type="number"
            inputMode="numeric"
            min={2000}
            max={2100}
            aria-invalid={!!e.publishYear}
            {...form.register("publishYear", { setValueAs: asOptionalNumber })}
          />
          <FieldError message={e.publishYear?.message} />
        </div>
      </div>

      <fieldset>
        <legend className="mb-2 text-small font-medium text-ink-700">Tür</legend>
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Tür">
          {TYPE_ORDER.map((t) => (
            <Chip
              key={t}
              selected={type === t}
              onClick={() => form.setValue("type", t, { shouldDirty: true })}
            >
              {resourceTypeLabels[t]}
            </Chip>
          ))}
        </div>
        <FieldError message={e.type?.message} />
      </fieldset>

      <fieldset>
        <legend className="mb-2 text-small font-medium text-ink-700">Ders</legend>
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Ders">
          {options.subjects.map((s) => (
            <Chip
              key={s.subjectId}
              selected={subjectId === s.subjectId}
              onClick={() => form.setValue("subjectId", s.subjectId, { shouldDirty: true })}
            >
              {s.shortName}
            </Chip>
          ))}
          <Chip
            selected={subjectId === null}
            onClick={() => form.setValue("subjectId", null, { shouldDirty: true })}
          >
            Çok dersli
          </Chip>
        </div>
        <p className="mt-1 text-micro-lg text-ink-500">
          Çok dersli kitapta her test partisi kendi dersini taşır.
        </p>
      </fieldset>
    </div>
  );
}

function Chip({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onClick}
      className={cn(
        "flex min-h-[38px] items-center rounded-xs border px-3 text-small font-medium pointer-coarse:min-h-11",
        selected
          ? "border-ink-900 bg-bg-surface text-ink-900"
          : "border-line bg-bg-paper text-ink-700 hover:bg-bg-surface",
        "clay:min-h-11 clay:clay-press clay:rounded-md clay:border-0 clay:px-4",
        selected ? "clay:clay-pressed" : "clay:clay-sm",
      )}
    >
      {children}
    </button>
  );
}

function BatchFields({
  index,
  control,
  form,
  multiSubject,
  subjects,
  onRemove,
}: {
  index: number;
  control: Control<ResourceFormInput>;
  form: UseFormReturn<ResourceFormInput>;
  multiSubject: boolean;
  subjects: ResourceOptions["subjects"];
  onRemove?: () => void;
}) {
  const batch = useWatch({ control, name: `batches.${index}` });
  const errors = form.formState.errors.batches?.[index];
  const from = Number(batch?.from ?? 0);
  const to = Number(batch?.to ?? 0);
  const count =
    Number.isFinite(from) && Number.isFinite(to) && to >= from && from >= 1 ? to - from + 1 : 0;
  const questions = count * Number(batch?.questionCount ?? 0);
  const pageStart = batch?.pageStart ?? null;
  const pages = batch?.pagesPerSection ?? null;
  const pageEnd = pageStart && pages && count > 0 ? pageStart + count * pages - 1 : null;
  const preview = [
    formatCount(count, "test"),
    questions > 0 ? formatCount(questions, "soru") : null,
    pageStart && pageEnd ? `s. ${pageStart}–${pageEnd}` : null,
  ]
    .filter(Boolean)
    .join(" · ");
  const id = `batch-${index}`;

  return (
    <div
      data-testid="section-batch"
      className="flex flex-col gap-3 rounded-sm border border-line bg-bg-paper p-4 clay:rounded-card clay:border-0 clay:clay-sm clay:bg-bg-raised"
    >
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div>
          <Label htmlFor={`${id}-prefix`}>Önek</Label>
          <Input id={`${id}-prefix`} maxLength={20} {...form.register(`batches.${index}.prefix`)} />
        </div>
        <div>
          <Label htmlFor={`${id}-from`}>Başlangıç</Label>
          <Input
            id={`${id}-from`}
            type="number"
            inputMode="numeric"
            min={1}
            aria-invalid={!!errors?.from}
            {...form.register(`batches.${index}.from`, { setValueAs: asNumber })}
          />
          <FieldError message={errors?.from?.message} />
        </div>
        <div>
          <Label htmlFor={`${id}-to`}>Bitiş</Label>
          <Input
            id={`${id}-to`}
            type="number"
            inputMode="numeric"
            min={1}
            aria-invalid={!!errors?.to}
            {...form.register(`batches.${index}.to`, { setValueAs: asNumber })}
          />
          <FieldError message={errors?.to?.message} />
        </div>
        <div>
          <Label htmlFor={`${id}-count`}>Soru / test</Label>
          <Input
            id={`${id}-count`}
            type="number"
            inputMode="numeric"
            min={1}
            max={200}
            aria-invalid={!!errors?.questionCount}
            {...form.register(`batches.${index}.questionCount`, { setValueAs: asOptionalNumber })}
          />
          <FieldError message={errors?.questionCount?.message} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div>
          <Label htmlFor={`${id}-page`}>İlk sayfa (isteğe bağlı)</Label>
          <Input
            id={`${id}-page`}
            type="number"
            inputMode="numeric"
            min={1}
            {...form.register(`batches.${index}.pageStart`, { setValueAs: asOptionalNumber })}
          />
        </div>
        <div>
          <Label htmlFor={`${id}-pages`}>Sayfa / test</Label>
          <Input
            id={`${id}-pages`}
            type="number"
            inputMode="numeric"
            min={1}
            {...form.register(`batches.${index}.pagesPerSection`, {
              setValueAs: asOptionalNumber,
            })}
          />
        </div>
        {multiSubject ? (
          <div className="col-span-2">
            <Label htmlFor={`${id}-subject`}>Partinin dersi</Label>
            <NativeSelect
              id={`${id}-subject`}
              aria-invalid={!!errors?.subjectId}
              {...form.register(`batches.${index}.subjectId`, {
                setValueAs: (v: unknown) => (v === "" || v === null ? null : String(v)),
              })}
            >
              <option value="">Ders seç</option>
              {subjects.map((s) => (
                <option key={s.subjectId} value={s.subjectId}>
                  {s.name}
                </option>
              ))}
            </NativeSelect>
            <FieldError message={errors?.subjectId?.message} />
          </div>
        ) : null}
      </div>
      <div className="flex items-center justify-between gap-3">
        <p className="text-small text-ink-700 tabular-nums" aria-live="polite">
          {preview}
        </p>
        {onRemove ? (
          <Button type="button" variant="ghost" onClick={onRemove}>
            <Trash2Icon aria-hidden="true" />
            Partiyi kaldır
          </Button>
        ) : null}
      </div>
    </div>
  );
}
