"use client";

import { useState } from "react";
import { FormError } from "@/components/shared/form-error";
import { Button } from "@/components/ui/button";
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

export type PickableStudent = {
  studentId: string;
  fullName: string;
  /** Zaten atanmış: işaretli ve devre dışı gösterilir. */
  assigned: boolean;
};

/**
 * Öğrenci seçme paneli (Faz 7, 11 §2): kaynak ve video listesi atama için ortak. Onay kutuları;
 * atanmış öğrenciler işaretli + devre dışı; "N öğrenciye ata" ile `onConfirm(seçilenler)`.
 * Kapatma ve sonuç bildirimi çağıran tarafta (eylem sonucu toast).
 */
export function StudentPicker({
  open,
  onOpenChange,
  title,
  description,
  students,
  pending,
  confirmLabel = "ata",
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  students: PickableStudent[];
  pending?: boolean;
  /** "N öğrenciye {confirmLabel}" */
  confirmLabel?: string;
  onConfirm: (studentIds: string[]) => void;
}) {
  return (
    <ResponsiveSheet open={open} onOpenChange={onOpenChange}>
      <ResponsiveSheetContent className="sm:max-w-md">
        {open ? (
          <Body
            title={title}
            description={description}
            students={students}
            pending={pending}
            confirmLabel={confirmLabel}
            onConfirm={onConfirm}
            onOpenChange={onOpenChange}
          />
        ) : null}
      </ResponsiveSheetContent>
    </ResponsiveSheet>
  );
}

function Body({
  title,
  description,
  students,
  pending,
  confirmLabel,
  onConfirm,
  onOpenChange,
}: {
  title: string;
  description?: string;
  students: PickableStudent[];
  pending?: boolean;
  confirmLabel: string;
  onConfirm: (studentIds: string[]) => void;
  onOpenChange: (open: boolean) => void;
}) {
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [error, setError] = useState<string>();
  const selectable = students.filter((s) => !s.assigned);

  function confirm() {
    if (selected.size === 0) {
      setError("En az bir öğrenci seç.");
      return;
    }
    setError(undefined);
    onConfirm([...selected]);
  }

  return (
    <>
      <ResponsiveSheetHeader>
        <ResponsiveSheetTitle>{title}</ResponsiveSheetTitle>
        {description ? (
          <ResponsiveSheetDescription>{description}</ResponsiveSheetDescription>
        ) : null}
      </ResponsiveSheetHeader>

      <ul className="flex flex-col gap-1.5" aria-label="Öğrenciler">
        {students.map((s) => {
          const checked = s.assigned || selected.has(s.studentId);
          return (
            <li key={s.studentId}>
              <label
                className={cn(
                  "flex min-h-[38px] items-center gap-3 rounded-xs border border-line bg-bg-paper px-3 text-small pointer-coarse:min-h-11",
                  s.assigned ? "text-ink-500" : "cursor-pointer",
                  checked && !s.assigned && "border-ink-900 bg-bg-surface",
                )}
              >
                <input
                  type="checkbox"
                  className="size-4 accent-ink-900"
                  checked={checked}
                  disabled={s.assigned}
                  onChange={(e) =>
                    setSelected((prev) => {
                      const next = new Set(prev);
                      if (e.target.checked) next.add(s.studentId);
                      else next.delete(s.studentId);
                      return next;
                    })
                  }
                />
                <span className="flex-1">{s.fullName}</span>
                {s.assigned ? <span className="text-micro">Atanmış</span> : null}
              </label>
            </li>
          );
        })}
        {students.length === 0 ? <li className="text-small text-ink-500">Öğrenci yok.</li> : null}
        {students.length > 0 && selectable.length === 0 ? (
          <li className="text-small text-ink-500">Tüm öğrencilere atanmış.</li>
        ) : null}
      </ul>

      <FormError message={error} />

      <ResponsiveSheetFooter>
        <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
          Vazgeç
        </Button>
        <Button type="button" onClick={confirm} disabled={pending || selectable.length === 0}>
          {pending
            ? "Atanıyor…"
            : selected.size > 0
              ? `${formatCount(selected.size, "öğrenciye")} ${confirmLabel}`
              : `Öğrenciye ${confirmLabel}`}
        </Button>
      </ResponsiveSheetFooter>
    </>
  );
}
