"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { FormError } from "@/components/shared/form-error";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { createAnnouncementSchema } from "../schemas";
import { createAnnouncement } from "../server/actions";

const chipClass = (on: boolean) =>
  cn(
    "flex min-h-11 items-center gap-2 rounded-xs border px-3 text-small font-medium",
    on
      ? "border-ink-900 bg-bg-surface text-ink-900"
      : "border-line bg-bg-paper text-ink-700 hover:bg-bg-surface",
  );

export type AnnouncementStudent = { studentId: string; fullName: string };

/**
 * Duyuru formu (12 §2 Adım 4): başlık, metin, hedef çipleri (Öğrenciler / Veliler; `checkbox`
 * rolü), "Tüm öğrenciler" ya da seçim (onay kutuları). Gönderilince bildirimler tetikleyicide.
 */
export function AnnouncementForm({ students }: { students: AnnouncementStudent[] }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [toStudents, setToStudents] = useState(true);
  const [toParents, setToParents] = useState(false);
  const [everyone, setEveryone] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(undefined);
    const roles = [
      ...(toStudents ? ["student" as const] : []),
      ...(toParents ? ["parent" as const] : []),
    ];
    const parsed = createAnnouncementSchema.safeParse({
      title,
      body,
      roles,
      studentIds: everyone ? null : [...selected],
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message);
      return;
    }
    startTransition(async () => {
      const result = await createAnnouncement(parsed.data);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      toast.success("Duyuru gönderildi.");
      setTitle("");
      setBody("");
      setSelected(new Set());
      setEveryone(true);
      router.refresh();
    });
  }

  return (
    <form
      onSubmit={submit}
      className="flex flex-col gap-4"
      noValidate
      data-testid="announcement-form"
    >
      <div className="flex flex-col gap-1">
        <Label htmlFor="ann-title">Başlık</Label>
        <Input
          id="ann-title"
          value={title}
          maxLength={80}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="ör. Cumartesi deneme"
        />
      </div>
      <div className="flex flex-col gap-1">
        <Label htmlFor="ann-body">Metin</Label>
        <textarea
          id="ann-body"
          rows={3}
          maxLength={1000}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="ör. Cumartesi 10:00'da kurumda deneme var; kalem ve silgi getirin."
          className="w-full rounded-xs border border-line-strong bg-bg-paper px-3 py-2 text-small text-ink-900 placeholder:text-ink-300"
        />
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-small font-medium text-ink-700">Kime gitsin?</legend>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Hedef kitle">
          <button
            type="button"
            role="checkbox"
            aria-checked={toStudents}
            onClick={() => setToStudents((v) => !v)}
            className={chipClass(toStudents)}
          >
            Öğrenciler
          </button>
          <button
            type="button"
            role="checkbox"
            aria-checked={toParents}
            onClick={() => setToParents((v) => !v)}
            className={chipClass(toParents)}
          >
            Veliler
          </button>
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-small font-medium text-ink-700">Hangi öğrenciler?</legend>
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Öğrenci kapsamı">
          <button
            type="button"
            role="radio"
            aria-checked={everyone}
            onClick={() => setEveryone(true)}
            className={chipClass(everyone)}
          >
            Tüm öğrenciler
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={!everyone}
            onClick={() => setEveryone(false)}
            className={chipClass(!everyone)}
          >
            Seçtiklerim
          </button>
        </div>
        {everyone ? null : (
          <ul className="flex flex-wrap gap-x-4 gap-y-1" aria-label="Öğrenciler">
            {students.map((s) => (
              <li key={s.studentId}>
                <label className="flex min-h-11 items-center gap-2 text-small text-ink-900">
                  <input
                    type="checkbox"
                    checked={selected.has(s.studentId)}
                    onChange={(e) =>
                      setSelected((prev) => {
                        const next = new Set(prev);
                        if (e.target.checked) next.add(s.studentId);
                        else next.delete(s.studentId);
                        return next;
                      })
                    }
                    className="size-4 accent-[var(--ink-900)]"
                  />
                  {s.fullName}
                </label>
              </li>
            ))}
          </ul>
        )}
      </fieldset>

      <FormError message={error} />
      <div>
        <Button type="submit" disabled={pending}>
          {pending ? "Gönderiliyor…" : "Duyuruyu gönder"}
        </Button>
      </div>
    </form>
  );
}
