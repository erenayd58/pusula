"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { FormError } from "@/components/shared/form-error";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateExamDateSchema } from "../schemas";
import { updateStudentExamDate } from "../server/student-actions";

/** Koç: öğrencinin sınav tarihini (LGS geri sayımı) düzenler. Tek alan, tek düğme. */
export function ExamDateForm({
  studentId,
  examDate,
}: {
  studentId: string;
  examDate: string | null;
}) {
  const router = useRouter();
  const [value, setValue] = useState(examDate ?? "");
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(undefined);
    const parsed = updateExamDateSchema.safeParse({ studentId, examDate: value });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message);
      return;
    }
    startTransition(async () => {
      const result = await updateStudentExamDate(parsed.data);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      toast.success("Sınav tarihi güncellendi.");
      router.refresh();
    });
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3" noValidate>
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-44">
          <Label htmlFor="exam-date">Sınav tarihi</Label>
          <Input
            id="exam-date"
            type="date"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            aria-invalid={!!error}
          />
        </div>
        <Button type="submit" variant="secondary" disabled={pending || value === (examDate ?? "")}>
          {pending ? "Kaydediliyor…" : "Tarihi kaydet"}
        </Button>
      </div>
      <FormError message={error} />
    </form>
  );
}
