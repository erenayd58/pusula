"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowDownIcon, ArrowUpIcon, PencilIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { toast } from "sonner";
import { FieldError } from "@/components/shared/field-error";
import { FormError } from "@/components/shared/form-error";
import { NativeSelect } from "@/components/shared/native-select";
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
import { formatCount } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  sectionBatchSchema,
  updateSectionSchema,
  type SectionBatchInput,
  type UpdateSectionInput,
} from "../schemas";
import {
  addSections,
  deleteSection,
  moveSection,
  setSectionTopics,
  updateSection,
} from "../server/actions";
import type { ResourceDetail, ResourceOptions, ResourceSection } from "../types";

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
const asOptionalId = (v: unknown) => (v === "" || v === null || v === undefined ? null : String(v));

/**
 * Test editörü (11 §2 Parça 1): satır = onay kutusu · başlık · ders rozeti · konu · soru · sayfa ·
 * ↑↓ · düzenle; çoklu seçim → "Konuya eşle" (seçili satırların dersine göre ünite konuları) ve
 * "Sil"; "Test ekle" partisi. Koç kataloğu ve öğrencinin kendi özel kaynağı aynı bileşeni kullanır.
 */
export function SectionEditor({
  resource,
  options,
}: {
  resource: ResourceDetail;
  options: ResourceOptions;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [editing, setEditing] = useState<ResourceSection | null>(null);
  const [adding, setAdding] = useState(false);
  const [mapTopic, setMapTopic] = useState("");
  const sections = resource.sections;
  const multiSubject = resource.subjectId === null;
  const subjectOf = (s: ResourceSection) => s.subjectId ?? resource.subjectId;
  const subjectMeta = new Map(options.subjects.map((s) => [s.subjectId, s]));

  // Seçili testlerin dersi tekse konu listesi o dersin ünite konuları; karışıksa eşleme kapalı.
  const selectedRows = sections.filter((s) => selected.has(s.id));
  const selectedSubjects = new Set(selectedRows.map(subjectOf).filter(Boolean));
  const mappable =
    selectedRows.length > 0 && selectedSubjects.size === 1 ? [...selectedSubjects][0]! : null;
  const topics = mappable ? (subjectMeta.get(mappable)?.topics ?? []) : [];
  const allSelected = sections.length > 0 && selected.size === sections.length;

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(sections.map((s) => s.id)));
  }
  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function run(work: () => Promise<{ ok: true } | { ok: false; error: string }>, success: string) {
    startTransition(async () => {
      const result = await work();
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(success);
      setSelected(new Set());
      router.refresh();
    });
  }

  function applyTopic() {
    if (!mappable) return;
    const topicId = mapTopic === "" ? null : mapTopic;
    const label = topicId ? (topics.find((t) => t.topicId === topicId)?.name ?? "konu") : null;
    run(
      () => setSectionTopics({ resourceId: resource.id, sectionIds: [...selected], topicId }),
      topicId
        ? `${formatCount(selected.size, "test")} “${label}” konusuna eşlendi.`
        : `${formatCount(selected.size, "test")} konu eşlemesi kaldırıldı.`,
    );
  }

  function removeSelected() {
    if (
      !window.confirm(
        `${formatCount(selected.size, "test")} silinsin mi? Bağlı soru kayıtları kalır.`,
      )
    )
      return;
    startTransition(async () => {
      for (const id of selected) {
        const result = await deleteSection({ id, resourceId: resource.id });
        if (!result.ok) {
          toast.error(result.error);
          break;
        }
      }
      toast.success("Testler silindi.");
      setSelected(new Set());
      router.refresh();
    });
  }

  function move(id: string, direction: "up" | "down") {
    startTransition(async () => {
      const result = await moveSection({ id, resourceId: resource.id, direction });
      if (!result.ok) toast.error(result.error);
      router.refresh();
    });
  }

  return (
    <section className="flex flex-col gap-3" aria-labelledby="section-editor-heading">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="section-editor-heading" className="text-heading font-semibold text-ink-900">
          {`Testler · ${formatCount(sections.length, "test")}`}
        </h2>
        <Button type="button" variant="secondary" onClick={() => setAdding(true)}>
          <PlusIcon aria-hidden="true" />
          Test ekle
        </Button>
      </div>

      {selected.size > 0 ? (
        <div
          data-testid="section-bulk-bar"
          className="flex flex-wrap items-center gap-2 rounded-sm border border-line bg-bg-surface p-2 text-small clay:rounded-card clay:border-0 clay:clay-sm"
        >
          <span className="px-2 text-ink-700">{`${formatCount(selected.size, "test")} seçili`}</span>
          {mappable ? (
            <>
              <Label htmlFor="section-map-topic" className="sr-only">
                Konu
              </Label>
              <NativeSelect
                id="section-map-topic"
                value={mapTopic}
                onChange={(e) => setMapTopic(e.target.value)}
                className="w-auto min-w-48 flex-1 sm:flex-none"
              >
                <option value="">Konu eşlemesini kaldır</option>
                {topics.map((t) => (
                  <option key={t.topicId} value={t.topicId}>
                    {t.name}
                  </option>
                ))}
              </NativeSelect>
              <Button type="button" onClick={applyTopic} disabled={pending}>
                Konuya eşle
              </Button>
            </>
          ) : (
            <span className="px-2 text-ink-500">Konuya eşlemek için aynı dersten testler seç.</span>
          )}
          <Button type="button" variant="secondary" onClick={removeSelected} disabled={pending}>
            <Trash2Icon aria-hidden="true" />
            Sil
          </Button>
        </div>
      ) : null}

      {sections.length === 0 ? (
        <p className="rounded-sm border border-line bg-bg-paper p-4 text-small text-ink-700 clay:rounded-card clay:border-0 clay:clay-sm">
          Bu kitapta henüz test yok. “Test ekle” ile bir parti üret (ör. Test 1–40, 20 soru).
        </p>
      ) : (
        <div className="overflow-x-auto rounded-sm border border-line bg-bg-paper clay:rounded-card clay:border-0 clay:clay-sm">
          <table className="w-full text-small" data-testid="section-table">
            <thead className="text-left text-micro-lg text-ink-500">
              <tr className="border-b border-line">
                <th className="px-3 py-2">
                  <input
                    type="checkbox"
                    className="size-4 accent-ink-900"
                    checked={allSelected}
                    onChange={toggleAll}
                    aria-label="Tümünü seç"
                  />
                </th>
                <th className="px-3 py-2 font-medium">Test</th>
                {multiSubject ? <th className="px-3 py-2 font-medium">Ders</th> : null}
                <th className="px-3 py-2 font-medium">Konu</th>
                <th className="px-3 py-2 text-right font-medium">Soru</th>
                <th className="px-3 py-2 text-right font-medium">Sayfa</th>
                <th className="px-3 py-2 text-right font-medium">Eylemler</th>
              </tr>
            </thead>
            <tbody>
              {sections.map((s, index) => {
                const subject = subjectOf(s) ? subjectMeta.get(subjectOf(s)!) : undefined;
                return (
                  <tr
                    key={s.id}
                    data-testid="section-row"
                    className={cn(
                      "border-b border-line last:border-b-0",
                      selected.has(s.id) && "bg-bg-surface",
                    )}
                  >
                    <td className="px-3 py-2">
                      <input
                        type="checkbox"
                        className="size-4 accent-ink-900"
                        checked={selected.has(s.id)}
                        onChange={() => toggle(s.id)}
                        aria-label={`${s.title} seç`}
                      />
                    </td>
                    <td className="px-3 py-2 font-medium text-ink-900">{s.title}</td>
                    {multiSubject ? (
                      <td className="px-3 py-2">
                        {subject ? (
                          <SubjectBadge color={subject.color} shortName={subject.shortName} />
                        ) : (
                          <span className="text-ink-500">—</span>
                        )}
                      </td>
                    ) : null}
                    <td className="px-3 py-2 text-ink-700">{s.topicName ?? "—"}</td>
                    <td className="px-3 py-2 text-right text-ink-700 tabular-nums">
                      {s.questionCount ?? "—"}
                    </td>
                    <td className="px-3 py-2 text-right text-ink-700 tabular-nums">
                      {s.pageStart
                        ? s.pageEnd && s.pageEnd !== s.pageStart
                          ? `${s.pageStart}–${s.pageEnd}`
                          : s.pageStart
                        : "—"}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex justify-end gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label={`${s.title} yukarı taşı`}
                          disabled={pending || index === 0}
                          onClick={() => move(s.id, "up")}
                        >
                          <ArrowUpIcon aria-hidden="true" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label={`${s.title} aşağı taşı`}
                          disabled={pending || index === sections.length - 1}
                          onClick={() => move(s.id, "down")}
                        >
                          <ArrowDownIcon aria-hidden="true" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label={`${s.title} düzenle`}
                          onClick={() => setEditing(s)}
                        >
                          <PencilIcon aria-hidden="true" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <SectionSheet
        resource={resource}
        options={options}
        section={editing}
        onOpenChange={(open) => {
          if (!open) setEditing(null);
        }}
      />
      <BatchSheet resource={resource} options={options} open={adding} onOpenChange={setAdding} />
    </section>
  );
}

/** Tek test düzenleme paneli. */
function SectionSheet({
  resource,
  options,
  section,
  onOpenChange,
}: {
  resource: ResourceDetail;
  options: ResourceOptions;
  section: ResourceSection | null;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <ResponsiveSheet open={section !== null} onOpenChange={onOpenChange}>
      <ResponsiveSheetContent className="sm:max-w-md">
        {section ? (
          <SectionFields
            key={section.id}
            resource={resource}
            options={options}
            section={section}
            onOpenChange={onOpenChange}
          />
        ) : null}
      </ResponsiveSheetContent>
    </ResponsiveSheet>
  );
}

function SectionFields({
  resource,
  options,
  section,
  onOpenChange,
}: {
  resource: ResourceDetail;
  options: ResourceOptions;
  section: ResourceSection;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string>();
  const multiSubject = resource.subjectId === null;
  const form = useForm<UpdateSectionInput>({
    resolver: zodResolver(updateSectionSchema),
    defaultValues: {
      id: section.id,
      resourceId: resource.id,
      title: section.title,
      subjectId: section.subjectId,
      topicId: section.topicId,
      questionCount: section.questionCount,
      pageStart: section.pageStart,
      pageEnd: section.pageEnd,
    },
  });
  const { errors } = form.formState;
  const subjectId = useWatch({ control: form.control, name: "subjectId" }) ?? resource.subjectId;
  const topics = options.subjects.find((s) => s.subjectId === subjectId)?.topics ?? [];

  const onSubmit = form.handleSubmit((values) => {
    setFormError(undefined);
    startTransition(async () => {
      const result = await updateSection(values);
      if (!result.ok) {
        setFormError(result.error);
        return;
      }
      toast.success("Test güncellendi.");
      onOpenChange(false);
      router.refresh();
    });
  });

  function remove() {
    if (!window.confirm(`“${section.title}” silinsin mi? Bağlı soru kayıtları kalır.`)) return;
    startTransition(async () => {
      const result = await deleteSection({ id: section.id, resourceId: resource.id });
      if (!result.ok) {
        setFormError(result.error);
        return;
      }
      toast.success("Test silindi.");
      onOpenChange(false);
      router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
      <ResponsiveSheetHeader>
        <ResponsiveSheetTitle>Testi düzenle</ResponsiveSheetTitle>
        <ResponsiveSheetDescription>{resource.title}</ResponsiveSheetDescription>
      </ResponsiveSheetHeader>
      <div>
        <Label htmlFor="section-title">Başlık</Label>
        <Input
          id="section-title"
          maxLength={60}
          aria-invalid={!!errors.title}
          {...form.register("title")}
        />
        <FieldError message={errors.title?.message} />
      </div>
      {multiSubject ? (
        <div>
          <Label htmlFor="section-subject">Ders</Label>
          <NativeSelect
            id="section-subject"
            {...form.register("subjectId", {
              setValueAs: asOptionalId,
              onChange: () => form.setValue("topicId", null),
            })}
          >
            <option value="">Ders seç</option>
            {options.subjects.map((s) => (
              <option key={s.subjectId} value={s.subjectId}>
                {s.name}
              </option>
            ))}
          </NativeSelect>
        </div>
      ) : null}
      <div>
        <Label htmlFor="section-topic">Konu</Label>
        <NativeSelect
          id="section-topic"
          {...form.register("topicId", { setValueAs: asOptionalId })}
        >
          <option value="">Konu eşlemesi yok</option>
          {topics.map((t) => (
            <option key={t.topicId} value={t.topicId}>
              {t.name}
            </option>
          ))}
        </NativeSelect>
        <FieldError message={errors.topicId?.message} />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <Label htmlFor="section-count">Soru</Label>
          <Input
            id="section-count"
            type="number"
            inputMode="numeric"
            min={1}
            max={200}
            aria-invalid={!!errors.questionCount}
            {...form.register("questionCount", { setValueAs: asOptionalNumber })}
          />
          <FieldError message={errors.questionCount?.message} />
        </div>
        <div>
          <Label htmlFor="section-page-start">İlk sayfa</Label>
          <Input
            id="section-page-start"
            type="number"
            inputMode="numeric"
            min={1}
            {...form.register("pageStart", { setValueAs: asOptionalNumber })}
          />
        </div>
        <div>
          <Label htmlFor="section-page-end">Son sayfa</Label>
          <Input
            id="section-page-end"
            type="number"
            inputMode="numeric"
            min={1}
            {...form.register("pageEnd", { setValueAs: asOptionalNumber })}
          />
        </div>
      </div>
      <FormError message={formError} />
      <ResponsiveSheetFooter>
        <Button type="button" variant="ghost" onClick={remove} disabled={pending}>
          <Trash2Icon aria-hidden="true" />
          Sil
        </Button>
        <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
          Vazgeç
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? "Kaydediliyor…" : "Kaydet"}
        </Button>
      </ResponsiveSheetFooter>
    </form>
  );
}

/** "Test ekle": mevcut kitaba parti. */
function BatchSheet({
  resource,
  options,
  open,
  onOpenChange,
}: {
  resource: ResourceDetail;
  options: ResourceOptions;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <ResponsiveSheet open={open} onOpenChange={onOpenChange}>
      <ResponsiveSheetContent className="sm:max-w-md">
        {open ? (
          <BatchFields resource={resource} options={options} onOpenChange={onOpenChange} />
        ) : null}
      </ResponsiveSheetContent>
    </ResponsiveSheet>
  );
}

function BatchFields({
  resource,
  options,
  onOpenChange,
}: {
  resource: ResourceDetail;
  options: ResourceOptions;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string>();
  const multiSubject = resource.subjectId === null;
  // Sonraki numara: mevcut "Önek N" başlıklarının en büyüğü + 1.
  const nextNumber =
    resource.sections.reduce((max, s) => {
      const m = /(\d+)\s*$/.exec(s.title);
      return m ? Math.max(max, Number(m[1])) : max;
    }, 0) + 1;
  const form = useForm<SectionBatchInput>({
    resolver: zodResolver(sectionBatchSchema),
    defaultValues: {
      prefix: "Test",
      from: nextNumber,
      to: nextNumber + 9,
      questionCount: resource.sections[0]?.questionCount ?? 20,
      pageStart: null,
      pagesPerSection: null,
      subjectId: null,
    },
  });
  const { errors } = form.formState;
  const from = Number(useWatch({ control: form.control, name: "from" }) ?? 0);
  const to = Number(useWatch({ control: form.control, name: "to" }) ?? 0);
  const count = to >= from && from >= 1 ? to - from + 1 : 0;

  const onSubmit = form.handleSubmit((batch) => {
    setFormError(undefined);
    startTransition(async () => {
      const result = await addSections({ resourceId: resource.id, batch });
      if (!result.ok) {
        setFormError(result.error);
        return;
      }
      toast.success(`${formatCount(result.data.added, "test")} eklendi.`);
      onOpenChange(false);
      router.refresh();
    });
  });

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
      <ResponsiveSheetHeader>
        <ResponsiveSheetTitle>Test ekle</ResponsiveSheetTitle>
        <ResponsiveSheetDescription>
          Numara aralığı ve her testin soru sayısı; sayfa isteğe bağlı.
        </ResponsiveSheetDescription>
      </ResponsiveSheetHeader>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="batch-prefix">Önek</Label>
          <Input id="batch-prefix" maxLength={20} {...form.register("prefix")} />
        </div>
        <div>
          <Label htmlFor="batch-count">Soru / test</Label>
          <Input
            id="batch-count"
            type="number"
            inputMode="numeric"
            min={1}
            max={200}
            aria-invalid={!!errors.questionCount}
            {...form.register("questionCount", { setValueAs: asOptionalNumber })}
          />
          <FieldError message={errors.questionCount?.message} />
        </div>
        <div>
          <Label htmlFor="batch-from">Başlangıç</Label>
          <Input
            id="batch-from"
            type="number"
            inputMode="numeric"
            min={1}
            aria-invalid={!!errors.from}
            {...form.register("from", { setValueAs: asNumber })}
          />
          <FieldError message={errors.from?.message} />
        </div>
        <div>
          <Label htmlFor="batch-to">Bitiş</Label>
          <Input
            id="batch-to"
            type="number"
            inputMode="numeric"
            min={1}
            aria-invalid={!!errors.to}
            {...form.register("to", { setValueAs: asNumber })}
          />
          <FieldError message={errors.to?.message} />
        </div>
        <div>
          <Label htmlFor="batch-page">İlk sayfa</Label>
          <Input
            id="batch-page"
            type="number"
            inputMode="numeric"
            min={1}
            {...form.register("pageStart", { setValueAs: asOptionalNumber })}
          />
        </div>
        <div>
          <Label htmlFor="batch-pages">Sayfa / test</Label>
          <Input
            id="batch-pages"
            type="number"
            inputMode="numeric"
            min={1}
            {...form.register("pagesPerSection", { setValueAs: asOptionalNumber })}
          />
        </div>
        {multiSubject ? (
          <div className="col-span-2">
            <Label htmlFor="batch-subject">Partinin dersi</Label>
            <NativeSelect
              id="batch-subject"
              {...form.register("subjectId", { setValueAs: asOptionalId })}
            >
              <option value="">Ders seç</option>
              {options.subjects.map((s) => (
                <option key={s.subjectId} value={s.subjectId}>
                  {s.name}
                </option>
              ))}
            </NativeSelect>
          </div>
        ) : null}
      </div>
      <p className="text-small text-ink-700 tabular-nums" aria-live="polite">
        {formatCount(count, "test")}
      </p>
      <FormError message={formError} />
      <ResponsiveSheetFooter>
        <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
          Vazgeç
        </Button>
        <Button type="submit" disabled={pending || count === 0}>
          {pending ? "Ekleniyor…" : "Ekle"}
        </Button>
      </ResponsiveSheetFooter>
    </form>
  );
}
