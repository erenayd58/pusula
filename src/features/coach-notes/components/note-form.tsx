"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { FormError } from "@/components/shared/form-error";
import { Button } from "@/components/ui/button";
import { noteVisibilityLabels } from "@/content/labels";
import { cn } from "@/lib/utils";
import type { NoteVisibility } from "@/types";
import { createNoteSchema, noteVisibilityValues, updateNoteSchema } from "../schemas";
import { createNote, updateNote } from "../server/actions";
import type { CoachNote } from "../types";

const BODY_MAX = 1000;

const chipClass = (on: boolean) =>
  cn(
    "flex min-h-11 items-center gap-2 rounded-xs border px-3 text-small font-medium",
    on
      ? "border-ink-900 bg-bg-surface text-ink-900"
      : "border-line bg-bg-paper text-ink-700 hover:bg-bg-surface",
  );

/**
 * Koç notu formu (12 §2 Adım 3): gövde + görünürlük çipleri (`radiogroup`: Sadece ben / Öğrenci /
 * Veli / Öğrenci ve veli) + sabitleme (yalnızca yeni notta). `note` verilirse düzenleme; görünürlük
 * sonradan değişince bildirim gitmez (yalnızca yeni görünür not bildirir).
 */
export function NoteForm({
  studentId,
  note,
  onDone,
  autoFocus,
}: {
  studentId: string;
  note?: CoachNote;
  /** Düzenlemede kaydet/vazgeç sonrası (satır içi formu kapatır). */
  onDone?: () => void;
  autoFocus?: boolean;
}) {
  const router = useRouter();
  const [body, setBody] = useState(note?.body ?? "");
  const [visibility, setVisibility] = useState<NoteVisibility>(note?.visibility ?? "coach_only");
  const [isPinned, setIsPinned] = useState(false);
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();
  const editing = note !== undefined;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(undefined);
    const parsed = editing
      ? updateNoteSchema.safeParse({ id: note.id, studentId, body, visibility })
      : createNoteSchema.safeParse({ studentId, body, visibility, isPinned });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message);
      return;
    }
    startTransition(async () => {
      const result = editing
        ? await updateNote({ id: note.id, studentId, body, visibility })
        : await createNote({ studentId, body, visibility, isPinned });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      toast.success(editing ? "Not güncellendi." : "Not kaydedildi.");
      if (!editing) {
        setBody("");
        setVisibility("coach_only");
        setIsPinned(false);
      }
      onDone?.();
      router.refresh();
    });
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3" noValidate data-testid="note-form">
      <div className="flex flex-col gap-1">
        <label
          htmlFor={`note-body-${note?.id ?? "new"}`}
          className="text-small font-medium text-ink-700"
        >
          {editing ? "Not" : "Yeni not"}
        </label>
        <textarea
          id={`note-body-${note?.id ?? "new"}`}
          rows={3}
          maxLength={BODY_MAX}
          value={body}
          autoFocus={autoFocus}
          onChange={(e) => setBody(e.target.value)}
          placeholder="ör. Paragraf hızı iyi; bu hafta yeni konu yerine tekrar."
          aria-invalid={!!error}
          className="w-full rounded-xs border border-line-strong bg-bg-paper px-3 py-2 text-small text-ink-900 placeholder:text-ink-300"
        />
        <span className="text-micro text-ink-500 tabular-nums">
          {body.length} / {BODY_MAX}
        </span>
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-small font-medium text-ink-700">Kim görsün?</legend>
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Görünürlük">
          {noteVisibilityValues.map((value) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={visibility === value}
              onClick={() => setVisibility(value)}
              className={chipClass(visibility === value)}
            >
              {noteVisibilityLabels[value]}
            </button>
          ))}
        </div>
      </fieldset>

      {editing ? null : (
        <label className="flex min-h-11 items-center gap-2 text-small text-ink-900">
          <input
            type="checkbox"
            checked={isPinned}
            onChange={(e) => setIsPinned(e.target.checked)}
            className="size-4 accent-[var(--ink-900)]"
          />
          Sabitle (Genel bakışta görünür)
        </label>
      )}

      <FormError message={error} />
      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={pending || body.trim() === ""}>
          {pending ? "Kaydediliyor…" : editing ? "Notu güncelle" : "Notu kaydet"}
        </Button>
        {editing ? (
          <Button type="button" variant="secondary" onClick={onDone} disabled={pending}>
            Vazgeç
          </Button>
        ) : null}
      </div>
    </form>
  );
}
