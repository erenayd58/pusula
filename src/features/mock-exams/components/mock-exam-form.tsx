"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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
import { mockExamSchema, type MockExamInput } from "../schemas";
import { upsertMockExam } from "../server/actions";
import type { CatalogTemplate, MockExam } from "../types";

export type MockExamSheetState = { mode: "new" } | { mode: "edit"; exam: MockExam } | null;

/**
 * Katalog denemesi formu (koç/owner; `ResponsiveSheet`): şablon, ad, yayınevi, tarih, tür
 * (genel / branş → ders). Düzenlemede şablon değiştirilemez (sonuçlar şablona bağlı).
 */
export function MockExamForm({
  templates,
  state,
  onOpenChange,
}: {
  templates: CatalogTemplate[];
  state: MockExamSheetState;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <ResponsiveSheet open={state !== null} onOpenChange={onOpenChange}>
      <ResponsiveSheetContent className="sm:max-w-md">
        {state ? (
          <Fields
            key={state.mode === "edit" ? state.exam.id : "new"}
            templates={templates}
            exam={state.mode === "edit" ? state.exam : null}
            onOpenChange={onOpenChange}
          />
        ) : null}
      </ResponsiveSheetContent>
    </ResponsiveSheet>
  );
}

function Fields({
  templates,
  exam,
  onOpenChange,
}: {
  templates: CatalogTemplate[];
  exam: MockExam | null;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string>();
  const form = useForm<MockExamInput>({
    resolver: zodResolver(mockExamSchema),
    defaultValues: {
      id: exam?.id,
      templateId: exam?.templateId ?? templates[0]?.id ?? "",
      title: exam?.title ?? "",
      publisher: exam?.publisher ?? "",
      examDate: exam?.examDate ?? null,
      subjectId: exam?.subjectId ?? null,
    },
  });
  const { errors } = form.formState;
  const templateId = useWatch({ control: form.control, name: "templateId" });
  const subjects = templates.find((t) => t.id === templateId)?.subjects ?? [];

  const onSubmit = form.handleSubmit((values) => {
    setFormError(undefined);
    startTransition(async () => {
      const result = await upsertMockExam(values);
      if (!result.ok) {
        setFormError(result.error);
        return;
      }
      toast.success(exam ? "Deneme güncellendi." : "Deneme tanımlandı.");
      onOpenChange(false);
      router.refresh();
    });
  });

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
      <ResponsiveSheetHeader>
        <ResponsiveSheetTitle>{exam ? "Denemeyi düzenle" : "Deneme tanımla"}</ResponsiveSheetTitle>
        <ResponsiveSheetDescription>
          Kataloga eklenen deneme, şablonu bu olan öğrencilerin giriş listesinde görünür.
        </ResponsiveSheetDescription>
      </ResponsiveSheetHeader>

      <div>
        <Label htmlFor="exam-template">Konu listesi (şablon)</Label>
        <NativeSelect
          id="exam-template"
          disabled={exam !== null}
          aria-invalid={!!errors.templateId}
          {...form.register("templateId", {
            onChange: () => form.setValue("subjectId", null),
          })}
        >
          {templates.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
              {t.isSystem ? " (sistem)" : ""}
            </option>
          ))}
        </NativeSelect>
        <FieldError message={errors.templateId?.message} />
      </div>

      <div>
        <Label htmlFor="exam-title">Deneme adı</Label>
        <Input
          id="exam-title"
          maxLength={80}
          placeholder="ör. Kafa Dengi Türkiye Geneli 3"
          aria-invalid={!!errors.title}
          {...form.register("title")}
        />
        <FieldError message={errors.title?.message} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="exam-publisher">Yayınevi</Label>
          <Input
            id="exam-publisher"
            maxLength={60}
            aria-invalid={!!errors.publisher}
            {...form.register("publisher")}
          />
          <FieldError message={errors.publisher?.message} />
        </div>
        <div>
          <Label htmlFor="exam-date">Tarih</Label>
          <Input
            id="exam-date"
            type="date"
            aria-invalid={!!errors.examDate}
            {...form.register("examDate", { setValueAs: (v: string) => (v === "" ? null : v) })}
          />
          <FieldError message={errors.examDate?.message} />
        </div>
      </div>

      <div>
        <Label htmlFor="exam-subject">Tür</Label>
        <NativeSelect
          id="exam-subject"
          aria-invalid={!!errors.subjectId}
          {...form.register("subjectId", { setValueAs: (v: string) => (v === "" ? null : v) })}
        >
          <option value="">Genel deneme (tüm dersler)</option>
          {subjects.map((s) => (
            <option key={s.subjectId} value={s.subjectId}>
              {`Branş · ${s.name}`}
            </option>
          ))}
        </NativeSelect>
        <FieldError message={errors.subjectId?.message} />
      </div>

      <FormError message={formError} />

      <ResponsiveSheetFooter>
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
