import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeftIcon } from "lucide-react";
import { z } from "zod";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { mockExamKindLabels } from "@/content/labels";
import { ExamComparisonTable, getExamComparison } from "@/features/mock-exams";
import { requireRole } from "@/lib/auth";
import { formatDateTr } from "@/lib/format";

export const metadata: Metadata = { title: "Deneme karşılaştırması" };

/** Katalog denemesi: aynı denemeyi giren öğrenciler × ders netleri (yalnızca koç). */
export default async function ExamComparisonPage({ params }: PageProps<"/coach/exams/[examId]">) {
  const { examId } = await params;
  if (!z.uuid().safeParse(examId).success) notFound();
  await requireRole("coach", "owner");
  const comparison = await getExamComparison(examId);
  if (!comparison) notFound();
  const { exam } = comparison;
  const meta = [exam.publisher, exam.examDate ? formatDateTr(exam.examDate, { year: true }) : null]
    .filter(Boolean)
    .join(" · ");

  return (
    <>
      <header className="flex flex-col gap-2">
        <Button asChild variant="ghost" className="w-fit">
          <Link href="/coach/exams">
            <ChevronLeftIcon aria-hidden="true" />
            Denemeler
          </Link>
        </Button>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-title font-semibold tracking-tight">{exam.title}</h1>
          <Badge>
            {exam.subjectId
              ? `${mockExamKindLabels.branch} · ${exam.subjectShortName ?? ""}`
              : mockExamKindLabels.general}
          </Badge>
        </div>
        {meta ? <p className="text-small text-ink-500">{meta}</p> : null}
      </header>
      <ExamComparisonTable comparison={comparison} />
    </>
  );
}
