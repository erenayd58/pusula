"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition, type FormEvent } from "react";
import { CameraIcon, ImageIcon, XIcon } from "lucide-react";
import { toast } from "sonner";
import { FormError } from "@/components/shared/form-error";
import { NativeSelect } from "@/components/shared/native-select";
import { subjectVars } from "@/components/shared/subject-scope";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { mistakeReasonLabels } from "@/content/labels";
import { compressImage, type CompressedImage } from "@/lib/image/compress";
import { formatCount } from "@/lib/format";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import type { MistakeReason } from "@/types";
import { BUCKET, imagePathFor } from "../lib/storage";
import { createMistakeSchema, mistakeReasonValues, updateMistakeSchema } from "../schemas";
import { createMistake, updateMistake } from "../server/actions";
import type { Mistake, MistakeOptions } from "../types";

const NOTE_MAX = 300;

const chipClass = (on: boolean) =>
  cn(
    "flex min-h-11 items-center gap-2 rounded-xs border px-3 text-small font-medium",
    on ? "border-ink-900 bg-bg-surface text-ink-900" : "border-line bg-bg-paper text-ink-700 hover:bg-bg-surface",
    "clay:min-h-12 clay:clay-press clay:rounded-md clay:border-0 clay:px-4",
    on ? "clay:clay-pressed" : "clay:clay-sm clay:bg-bg-raised",
  );

/**
 * Yanlış kaydı formu (10 §2 Parça 2; karar C7 eki). Sıra: en üstte fotoğraf alanı (kamera /
 * galeri; `compressImage` ile 1600 px webp), fotoğraf yoksa not alanı hemen altında açık ve ipuçlu,
 * fotoğraf seçilince "Not ekle" katlanır bölümüne iner (ikisi de zorunlu değil); ders çipleri
 * (zorunlu), konu (isteğe bağlı), neden çipleri ("Bilmiyorum" seçili gelir). Fotoğraf doğrudan
 * bucket'a yüklenir (RLS yol klasörünü denetler), sonra `createMistake`; satır yazılamazsa nesne
 * silinir. `initial` verilirse düzenleme (fotoğraf değişmez). Öğrenciye "sen".
 */
export function MistakeForm({
  studentId,
  options,
  initial,
  prefill,
  basePath,
}: {
  studentId: string;
  options: MistakeOptions;
  initial: Mistake | null;
  prefill: { subjectId?: string; topicId?: string; mockResultId?: string };
  basePath: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);
  const [photo, setPhoto] = useState<CompressedImage | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [reading, setReading] = useState(false);
  const [subjectId, setSubjectId] = useState<string | null>(
    initial?.subjectId ?? prefill.subjectId ?? null,
  );
  const [topicId, setTopicId] = useState<string | null>(initial?.topicId ?? prefill.topicId ?? null);
  const [reason, setReason] = useState<MistakeReason>(initial?.reason ?? "unknown");
  const [note, setNote] = useState(initial?.note ?? "");
  const [error, setError] = useState<string>();

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  const subject = options.subjects.find((s) => s.subjectId === subjectId);
  const topics = subject?.topics ?? [];
  const editing = initial !== null;
  const hasPhoto = photo !== null || (editing && initial.imageUrl !== null);

  async function pick(file: File | undefined) {
    setError(undefined);
    if (!file) return;
    setReading(true);
    try {
      const compressed = await compressImage(file);
      if (preview) URL.revokeObjectURL(preview);
      setPhoto(compressed);
      setPreview(URL.createObjectURL(compressed.blob));
    } catch {
      setError("Fotoğraf okunamadı. Başka bir fotoğraf dene.");
    } finally {
      setReading(false);
    }
  }

  function clearPhoto() {
    if (preview) URL.revokeObjectURL(preview);
    setPhoto(null);
    setPreview(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    setError(undefined);
    if (!subjectId) {
      setError("Dersi seç.");
      return;
    }
    startTransition(async () => {
      if (editing) {
        const parsed = updateMistakeSchema.safeParse({
          id: initial.id,
          studentId,
          subjectId,
          topicId,
          reason,
          note,
        });
        if (!parsed.success) {
          setError(parsed.error.issues[0]?.message ?? "Formu kontrol et.");
          return;
        }
        const result = await updateMistake(parsed.data);
        if (!result.ok) {
          setError(result.error);
          return;
        }
        toast.success("Kayıt güncellendi.");
        router.push(`${basePath}/${initial.id}`);
        router.refresh();
        return;
      }

      const supabase = createClient();
      let imagePath: string | null = null;
      if (photo) {
        imagePath = imagePathFor(options.organizationId, studentId, photo.ext);
        const { error: uploadError } = await supabase.storage
          .from(BUCKET)
          .upload(imagePath, photo.blob, { contentType: photo.blob.type, upsert: false });
        if (uploadError) {
          setError("Fotoğraf yüklenemedi. İnternet bağlantını kontrol edip tekrar dene.");
          return;
        }
      }
      const parsed = createMistakeSchema.safeParse({
        subjectId,
        topicId,
        mockResultId: prefill.mockResultId ?? null,
        imagePath,
        reason,
        note,
      });
      if (!parsed.success) {
        if (imagePath) await supabase.storage.from(BUCKET).remove([imagePath]);
        setError(parsed.error.issues[0]?.message ?? "Formu kontrol et.");
        return;
      }
      const result = await createMistake(parsed.data);
      if (!result.ok) {
        if (imagePath) await supabase.storage.from(BUCKET).remove([imagePath]);
        setError(result.error);
        return;
      }
      toast.success("Yanlış deftere eklendi.");
      router.push(basePath);
      router.refresh();
    });
  }

  const noteField = (
    <div>
      <Label htmlFor="mistake-note">{hasPhoto ? "Not" : "Soru ya da not"}</Label>
      <textarea
        id="mistake-note"
        rows={hasPhoto ? 2 : 3}
        maxLength={NOTE_MAX}
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder={
          hasPhoto ? "ör. İşaretleri karıştırdım" : "Soruyu kısaca yaz ya da fotoğraf ekle"
        }
        className={cn(
          "w-full rounded-xs border border-line-strong bg-bg-paper px-3 py-2 text-small text-ink-900 placeholder:text-ink-300",
          "clay:rounded-md clay:border-0 clay:clay-well clay:px-4 clay:py-3 clay:text-body",
        )}
      />
      <p className="mt-1 text-micro-lg text-ink-500">
        {hasPhoto
          ? `${formatCount(NOTE_MAX - note.length)} karakter kaldı`
          : "İkisi de zorunlu değil; sadece dersi seçip kaydedebilirsin."}
      </p>
    </div>
  );

  return (
    <form onSubmit={submit} className="flex flex-col gap-5" noValidate data-testid="mistake-form">
      {!editing ? (
        <div className="flex flex-col gap-2">
          <span className="text-small font-medium text-ink-700">Fotoğraf</span>
          <input
            ref={fileRef}
            id="mistake-photo"
            type="file"
            accept="image/*"
            capture="environment"
            className="sr-only"
            aria-label="Fotoğraf seç"
            onChange={(e) => pick(e.target.files?.[0])}
          />
          {preview ? (
            <div className="relative overflow-hidden rounded-sm border border-line bg-bg-paper clay:rounded-card clay:border-0 clay:clay-sm">
              {/* eslint-disable-next-line @next/next/no-img-element -- yerel önizleme (blob URL) */}
              <img
                src={preview}
                alt="Seçilen fotoğrafın önizlemesi"
                className="block max-h-72 w-full object-contain"
                data-testid="mistake-photo-preview"
              />
              <Button
                type="button"
                variant="secondary"
                onClick={clearPhoto}
                className="absolute top-2 right-2"
              >
                <XIcon aria-hidden="true" />
                Kaldır
              </Button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={reading}
              className={cn(
                "flex min-h-24 w-full flex-col items-center justify-center gap-1.5 rounded-sm border border-dashed border-line-strong bg-bg-paper px-4 py-4 text-small text-ink-700 hover:bg-bg-surface",
                "clay:rounded-card clay:border-0 clay:clay-press clay:clay-sm clay:bg-bg-raised clay:py-6",
              )}
            >
              <CameraIcon aria-hidden="true" className="size-6 text-ink-500" />
              <span className="font-medium text-ink-900">
                {reading ? "Fotoğraf hazırlanıyor…" : "Fotoğraf çek ya da seç"}
              </span>
              <span className="text-micro-lg text-ink-500">İsteğe bağlı · en fazla 2 MB’a küçültülür</span>
            </button>
          )}
        </div>
      ) : initial.imageUrl ? (
        <p className="flex items-center gap-2 text-small text-ink-500">
          <ImageIcon aria-hidden="true" className="size-4" />
          Fotoğraf değiştirilemez; gerekirse kaydı silip yeniden ekle.
        </p>
      ) : null}

      {!hasPhoto ? noteField : null}

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-small font-medium text-ink-700">Ders</legend>
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Ders">
          {options.subjects.map((s) => {
            const on = subjectId === s.subjectId;
            return (
              <button
                key={s.subjectId}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => {
                  setSubjectId(s.subjectId);
                  if (s.subjectId !== subjectId) setTopicId(null);
                }}
                style={subjectVars(s.color)}
                className={cn(
                  chipClass(on),
                  on && "border-subject bg-subject-soft text-subject-ink clay:bg-subject-soft",
                )}
              >
                <span aria-hidden="true" className="size-2 rounded-full bg-subject" />
                {s.shortName}
              </button>
            );
          })}
        </div>
      </fieldset>

      <div className="max-w-md">
        <Label htmlFor="mistake-topic">Konu (isteğe bağlı)</Label>
        <NativeSelect
          id="mistake-topic"
          value={topicId ?? ""}
          onChange={(e) => setTopicId(e.target.value === "" ? null : e.target.value)}
          disabled={!subject}
        >
          <option value="">{subject ? "Konu seçilmedi" : "Önce dersi seç"}</option>
          {topics.map((t) => (
            <option key={t.topicId} value={t.topicId}>
              {t.name}
            </option>
          ))}
        </NativeSelect>
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-small font-medium text-ink-700">Neden yanlış yaptın?</legend>
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Neden">
          {mistakeReasonValues.map((value) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={reason === value}
              onClick={() => setReason(value)}
              className={chipClass(reason === value)}
            >
              {mistakeReasonLabels[value]}
            </button>
          ))}
        </div>
      </fieldset>

      {hasPhoto ? (
        <details
          open={editing && note !== ""}
          className="group rounded-sm border border-line bg-bg-paper clay:rounded-card clay:border-0 clay:clay-sm clay:bg-bg-raised"
        >
          <summary className="cursor-pointer list-none px-4 py-3 text-small font-medium text-ink-900 select-none">
            Not ekle
          </summary>
          <div className="px-4 pb-4">{noteField}</div>
        </details>
      ) : null}

      <FormError message={error} />

      <div className="flex flex-wrap justify-end gap-2">
        <Button type="button" variant="secondary" onClick={() => router.back()} disabled={pending}>
          Vazgeç
        </Button>
        <Button type="submit" disabled={pending || reading}>
          {pending
            ? photo
              ? "Fotoğraf yükleniyor…"
              : "Kaydediliyor…"
            : editing
              ? "Kaydet"
              : "Deftere ekle"}
        </Button>
      </div>
    </form>
  );
}
