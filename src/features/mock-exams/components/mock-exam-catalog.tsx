"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { PencilIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { mockExamKindLabels } from "@/content/labels";
import { formatCount, formatDateTr } from "@/lib/format";
import { deleteMockExam } from "../server/actions";
import type { CatalogTemplate, MockExam } from "../types";
import { MockExamForm, type MockExamSheetState } from "./mock-exam-form";

/**
 * Deneme kataloğu (koç, flat): tablo (ad, yayınevi, tarih, tür, giren öğrenci sayısı); satır →
 * karşılaştırma. "Deneme tanımla" formu; düzenle / sil (sonucu olan deneme silinemez, karar C5;
 * eylem mesajı "Bu denemeyi 3 öğrenci girdi; önce sonuçları sil").
 */
export function MockExamCatalog({
  exams,
  templates,
}: {
  exams: MockExam[];
  templates: CatalogTemplate[];
}) {
  const router = useRouter();
  const [sheet, setSheet] = useState<MockExamSheetState>(null);
  const [pending, startTransition] = useTransition();
  const templateNames = new Map(templates.map((t) => [t.id, t.name]));

  function remove(exam: MockExam) {
    if (!window.confirm(`“${exam.title}” kataloğdan silinsin mi?`)) return;
    startTransition(async () => {
      const result = await deleteMockExam({ id: exam.id });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Deneme silindi.");
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <Button onClick={() => setSheet({ mode: "new" })} disabled={templates.length === 0}>
          <PlusIcon aria-hidden="true" />
          Deneme tanımla
        </Button>
      </div>

      {exams.length === 0 ? (
        <p className="rounded-sm border border-line bg-bg-paper p-6 text-small text-ink-700">
          Katalogda deneme yok. Yayınevi denemesini tanımla; öğrenciler listeden seçip netlerini
          girer, sen aynı denemeyi girenleri karşılaştırırsın.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-sm border border-line bg-bg-paper">
          <table className="w-full text-small" data-testid="mock-exam-catalog">
            <thead className="text-left text-micro-lg text-ink-500">
              <tr className="border-b border-line">
                <th className="px-4 py-3 font-medium">Deneme</th>
                <th className="px-4 py-3 font-medium">Yayınevi</th>
                <th className="px-4 py-3 font-medium">Tarih</th>
                <th className="px-4 py-3 font-medium">Tür</th>
                <th className="px-4 py-3 text-right font-medium">Giren</th>
                <th className="px-4 py-3 text-right font-medium">Eylemler</th>
              </tr>
            </thead>
            <tbody>
              {exams.map((e) => (
                <tr
                  key={e.id}
                  data-testid="mock-exam-row"
                  className="border-b border-line last:border-b-0"
                >
                  <td className="px-4 py-3">
                    <div className="flex flex-col">
                      <Link
                        href={`/coach/exams/${e.id}`}
                        className="font-medium text-ink-900 underline-offset-4 hover:underline"
                      >
                        {e.title}
                      </Link>
                      <span className="text-micro-lg text-ink-500">
                        {templateNames.get(e.templateId) ?? ""}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-ink-700">{e.publisher ?? "—"}</td>
                  <td className="px-4 py-3 text-ink-700">
                    {e.examDate ? formatDateTr(e.examDate, { year: true }) : "—"}
                  </td>
                  <td className="px-4 py-3 text-ink-700">
                    {e.subjectId
                      ? `${mockExamKindLabels.branch} · ${e.subjectShortName ?? ""}`
                      : mockExamKindLabels.general}
                  </td>
                  <td className="px-4 py-3 text-right text-ink-900 tabular-nums">
                    {formatCount(e.resultCount, "öğrenci")}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="secondary"
                        size="icon"
                        aria-label={`${e.title} düzenle`}
                        onClick={() => setSheet({ mode: "edit", exam: e })}
                      >
                        <PencilIcon aria-hidden="true" />
                      </Button>
                      <Button
                        variant="secondary"
                        size="icon"
                        aria-label={`${e.title} sil`}
                        disabled={pending}
                        onClick={() => remove(e)}
                      >
                        <Trash2Icon aria-hidden="true" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <MockExamForm
        templates={templates}
        state={sheet}
        onOpenChange={(open) => {
          if (!open) setSheet(null);
        }}
      />
    </div>
  );
}
