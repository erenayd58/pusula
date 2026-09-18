"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm, type Path, type UseFormReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { FieldError } from "@/components/shared/field-error";
import { FormError } from "@/components/shared/form-error";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { OrgSettings } from "../lib/org-settings";
import { orgSettingsFormSchema, type OrgSettingsFormInput } from "../schemas";
import { updateOrgSettings } from "../server/org-settings-actions";

type FieldPath = Path<OrgSettingsFormInput>;

/** Boş alan NaN → şema "Sayı gir." der; ondalık virgülle de girilebilir (1,5). */
const asNumber = (v: unknown) =>
  typeof v === "number"
    ? v
    : Number(
        String(v ?? "")
          .trim()
          .replace(",", "."),
      );

/** "7, 15, 30" → [7, 15, 30]; boş parçalar atlanır, sayı olmayan parça NaN kalır (şema yakalar). */
const asIntList = (v: unknown) =>
  Array.isArray(v)
    ? v
    : String(v ?? "")
        .split(/[,\s]+/)
        .filter(Boolean)
        .map((s) => Number(s));

/**
 * Kurum ayarları formu (flat, karar A5): dört bölüm, sayı alanları. Owner düzenler; koç salt
 * okunur görür. Aynı zod şeması eylemde de kullanılır; kaydedince uyarılar ve plan önerileri
 * yeni eşiklerle hesaplanır.
 */
export function OrgSettingsForm({ initial, canEdit }: { initial: OrgSettings; canEdit: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string>();
  const form = useForm<OrgSettingsFormInput>({
    resolver: zodResolver(orgSettingsFormSchema),
    defaultValues: initial,
  });

  const onSubmit = form.handleSubmit((values) => {
    setFormError(undefined);
    startTransition(async () => {
      const result = await updateOrgSettings(values);
      if (!result.ok) {
        setFormError(result.error);
        return;
      }
      toast.success("Ayarlar kaydedildi.");
      form.reset(values);
      router.refresh();
    });
  });

  const field = { form, disabled: !canEdit };

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-6" noValidate>
      {!canEdit ? (
        <p className="rounded-sm border border-line bg-bg-surface px-4 py-3 text-small text-ink-700">
          Ayarları yalnızca kurum sahibi düzenleyebilir; burada geçerli değerler görünür.
        </p>
      ) : null}

      <Section
        title="Program"
        hint="Öğrencinin günde çalışabileceği aralık; müsait süre bundan hesaplanır."
      >
        <TimeField {...field} name="schedule.wake_start" label="Gün başlangıcı" />
        <TimeField {...field} name="schedule.wake_end" label="Gün bitişi" />
      </Section>

      <Section title="Plan" hint="Görev formundaki süre önerileri ve önerilen plan sınırları.">
        <NumberField
          {...field}
          name="planner.minutes_per_question"
          label="Soru başına dakika"
          step="0.1"
          hint="Öğrencinin temposu yoksa"
        />
        <NumberField {...field} name="planner.questions_target" label="Varsayılan soru hedefi" />
        <NumberField {...field} name="planner.topic_study_minutes" label="Konu çalışması (dk)" />
        <NumberField {...field} name="planner.review_minutes" label="Tekrar (dk)" />
        <NumberField {...field} name="planner.link_minutes" label="Bağlantı (dk)" />
        <NumberField {...field} name="planner.custom_minutes" label="Serbest görev (dk)" />
        <NumberField
          {...field}
          name="planner.day_capacity_ratio"
          label="Gün doluluk oranı"
          step="0.05"
          hint="Müsait sürenin ne kadarı planlanır (0,1–1)"
        />
        <NumberField
          {...field}
          name="planner.max_items_per_subject_per_day"
          label="Günde ders başına en fazla görev"
        />
      </Section>

      <Section
        title="Uyarılar"
        hint="Konu uyarı eşikleri; değişiklik “Dikkat gerektirenler” listesini hemen etkiler."
      >
        <NumberField
          {...field}
          name="alerts.lookback_days"
          label="Soru penceresi (gün)"
          hint="Başarı bu kadar günün kayıtlarından"
        />
        <NumberField
          {...field}
          name="alerts.knowledge_gap.min_questions"
          label="Bilgi eksiği: en az soru"
        />
        <NumberField
          {...field}
          name="alerts.knowledge_gap.max_accuracy"
          label="Bilgi eksiği: başarı altı (%)"
        />
        <NumberField
          {...field}
          name="alerts.low_accuracy.min_questions"
          label="Düşük başarı: en az soru"
        />
        <NumberField
          {...field}
          name="alerts.low_accuracy.max_accuracy"
          label="Düşük başarı: başarı altı (%)"
        />
        <ListField
          {...field}
          name="alerts.review_due_days"
          label="Tekrar günleri"
          hint="Tamamlandıktan kaç gün sonra; virgülle ayır"
        />
        <NumberField
          {...field}
          name="alerts.forgetting_risk.min_accuracy"
          label="Unutma riski: başarı üstü (%)"
        />
        <NumberField
          {...field}
          name="alerts.forgetting_risk.idle_days"
          label="Unutma riski: bakılmayan gün"
        />
        <NumberField {...field} name="alerts.stale_days" label="Soğumuş konu (gün)" />
        <NumberField
          {...field}
          name="alerts.neglected_subject_days"
          label="İhmal edilen ders (gün)"
        />
        <NumberField
          {...field}
          name="alerts.setup_account_days"
          label="Kurulum: hesap yaşı (gün)"
          hint="Bu kadar günden eski hesapta hiç soru kaydı yoksa koç uyarılır"
        />
      </Section>

      <Section title="Öneriler" hint="Koç ana ekranındaki öneriler ve “Şimdi değil” süresi.">
        <NumberField
          {...field}
          name="suggestions.max_per_student"
          label="Öğrenci başına en fazla öneri"
        />
        <NumberField
          {...field}
          name="suggestions.dismiss_days"
          label="“Şimdi değil” süresi (gün)"
        />
      </Section>

      <FormError message={formError} />
      {canEdit ? (
        <div className="flex flex-wrap gap-2">
          <Button type="submit" disabled={pending}>
            {pending ? "Kaydediliyor…" : "Ayarları kaydet"}
          </Button>
          <Button
            type="button"
            variant="secondary"
            disabled={pending || !form.formState.isDirty}
            onClick={() => form.reset()}
          >
            Değişiklikleri geri al
          </Button>
        </div>
      ) : null}
    </form>
  );
}

function Section({
  title,
  hint,
  children,
}: {
  title: string;
  hint: string;
  children: React.ReactNode;
}) {
  return (
    <fieldset className="flex flex-col gap-4 rounded-sm border border-line bg-bg-paper p-4">
      <legend className="sr-only">{title}</legend>
      <div className="flex flex-col gap-0.5">
        <h2 aria-hidden="true" className="text-heading font-semibold text-ink-900">
          {title}
        </h2>
        <p className="text-small text-ink-500">{hint}</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{children}</div>
    </fieldset>
  );
}

type FieldProps = {
  form: UseFormReturn<OrgSettingsFormInput>;
  name: FieldPath;
  label: string;
  hint?: string;
  disabled: boolean;
};

function fieldId(name: FieldPath) {
  return `org-${name.replace(/\./g, "-")}`;
}

function NumberField({ form, name, label, hint, disabled, step }: FieldProps & { step?: string }) {
  const error = form.getFieldState(name, form.formState).error?.message;
  const id = fieldId(name);
  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type="number"
        inputMode="decimal"
        step={step ?? 1}
        disabled={disabled}
        aria-invalid={!!error}
        aria-describedby={hint ? `${id}-hint` : undefined}
        {...form.register(name, { setValueAs: asNumber })}
      />
      {hint ? (
        <p id={`${id}-hint`} className="mt-1 text-micro-lg text-ink-500">
          {hint}
        </p>
      ) : null}
      <FieldError message={error} />
    </div>
  );
}

function TimeField({ form, name, label, hint, disabled }: FieldProps) {
  const error = form.getFieldState(name, form.formState).error?.message;
  const id = fieldId(name);
  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type="time"
        disabled={disabled}
        aria-invalid={!!error}
        {...form.register(name)}
      />
      {hint ? <p className="mt-1 text-micro-lg text-ink-500">{hint}</p> : null}
      <FieldError message={error} />
    </div>
  );
}

/** Tek liste alanı (tekrar günleri): hata dizide, kökte ya da bir öğede olabilir. */
function ListField({
  form,
  name,
  label,
  hint,
  disabled,
}: FieldProps & { name: "alerts.review_due_days" }) {
  const errs = form.formState.errors.alerts?.review_due_days;
  const error =
    errs?.message ??
    errs?.root?.message ??
    (Array.isArray(errs) ? errs.find((e) => e?.message)?.message : undefined);
  const id = fieldId(name);
  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type="text"
        inputMode="numeric"
        disabled={disabled}
        aria-invalid={!!error}
        aria-describedby={hint ? `${id}-hint` : undefined}
        {...form.register(name, { setValueAs: asIntList })}
      />
      {hint ? (
        <p id={`${id}-hint`} className="mt-1 text-micro-lg text-ink-500">
          {hint}
        </p>
      ) : null}
      <FieldError message={error} />
    </div>
  );
}
