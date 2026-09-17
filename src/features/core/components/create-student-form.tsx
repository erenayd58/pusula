"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { USERNAME_RULE_MESSAGE } from "@/lib/auth/username";
import { createStudentSchema, type CreateStudentInput } from "../schemas";
import { createStudent } from "../server/student-actions";
import { FieldError } from "./field-error";
import { FormError } from "./form-error";
import { NativeSelect } from "./native-select";

type CoachOption = { id: string; fullName: string };
type TemplateOption = { id: string; name: string };

export function CreateStudentForm({
  coaches,
  templates,
  defaultSeason,
  defaultExamDate,
}: {
  /** Owner için koç seçenekleri; koçta boş (kendisi atanır). */
  coaches: CoachOption[];
  /** Müfredat şablonları; ilki (sistem şablonu) varsayılan seçili. */
  templates: TemplateOption[];
  defaultSeason: string;
  defaultExamDate: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string>();
  const form = useForm<CreateStudentInput>({
    resolver: zodResolver(createStudentSchema),
    defaultValues: {
      fullName: "",
      username: "",
      temporaryPassword: "",
      season: defaultSeason,
      examDate: defaultExamDate,
      curriculumTemplateId: templates[0]?.id ?? "",
      coachId: coaches[0]?.id,
    },
  });
  const { errors } = form.formState;

  const onSubmit = form.handleSubmit((values) => {
    setFormError(undefined);
    startTransition(async () => {
      const result = await createStudent(values);
      if (!result.ok) {
        setFormError(result.error);
        for (const [field, messages] of Object.entries(result.fieldErrors ?? {})) {
          if (field in values) {
            form.setError(field as keyof CreateStudentInput, { message: messages[0] });
          }
        }
        return;
      }
      toast.success("Öğrenci oluşturuldu.");
      router.push("/coach/students");
    });
  });

  return (
    <form onSubmit={onSubmit} className="flex max-w-lg flex-col gap-5" noValidate>
      <div>
        <Label htmlFor="fullName">Ad soyad</Label>
        <Input
          id="fullName"
          autoComplete="off"
          aria-invalid={!!errors.fullName}
          {...form.register("fullName")}
        />
        <FieldError message={errors.fullName?.message} />
      </div>

      <div>
        <Label htmlFor="username">Kullanıcı adı</Label>
        <Input
          id="username"
          autoComplete="off"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          aria-invalid={!!errors.username}
          aria-describedby="username-rule"
          {...form.register("username")}
        />
        <p id="username-rule" className="mt-1.5 text-micro-lg text-ink-500">
          {USERNAME_RULE_MESSAGE} Öğrenci bununla giriş yapar; sonradan değişmez.
        </p>
        <FieldError message={errors.username?.message} />
      </div>

      <div>
        <Label htmlFor="temporaryPassword">Geçici şifre</Label>
        <Input
          id="temporaryPassword"
          type="text"
          autoComplete="off"
          aria-invalid={!!errors.temporaryPassword}
          {...form.register("temporaryPassword")}
        />
        <p className="mt-1.5 text-micro-lg text-ink-500">
          En az 8 karakter. Öğrenciye ilet; gerekirse listeden sıfırlayabilirsin.
        </p>
        <FieldError message={errors.temporaryPassword?.message} />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <Label htmlFor="season">Sezon</Label>
          <Input
            id="season"
            placeholder="2026-2027"
            aria-invalid={!!errors.season}
            {...form.register("season")}
          />
          <FieldError message={errors.season?.message} />
        </div>
        <div>
          <Label htmlFor="examDate">Sınav tarihi</Label>
          <Input
            id="examDate"
            type="date"
            aria-invalid={!!errors.examDate}
            {...form.register("examDate")}
          />
          <FieldError message={errors.examDate?.message} />
        </div>
      </div>

      <div>
        <Label htmlFor="curriculumTemplateId">Konu listesi (şablon)</Label>
        <NativeSelect
          id="curriculumTemplateId"
          aria-invalid={!!errors.curriculumTemplateId}
          {...form.register("curriculumTemplateId")}
        >
          {templates.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </NativeSelect>
        <p className="mt-1.5 text-micro-lg text-ink-500">
          Öğrencinin konu haritası bu şablonun ders ve konularından oluşur.
        </p>
        <FieldError message={errors.curriculumTemplateId?.message} />
      </div>

      {coaches.length > 0 ? (
        <div>
          <Label htmlFor="coachId">Koç</Label>
          <NativeSelect id="coachId" aria-invalid={!!errors.coachId} {...form.register("coachId")}>
            {coaches.map((c) => (
              <option key={c.id} value={c.id}>
                {c.fullName}
              </option>
            ))}
          </NativeSelect>
          <FieldError message={errors.coachId?.message} />
        </div>
      ) : null}

      <FormError message={formError} />

      <div className="flex flex-wrap gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Oluşturuluyor…" : "Öğrenciyi oluştur"}
        </Button>
        <Button type="button" variant="secondary" onClick={() => router.push("/coach/students")}>
          Vazgeç
        </Button>
      </div>
    </form>
  );
}
