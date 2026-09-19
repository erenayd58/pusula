import type { Metadata } from "next";
import Link from "next/link";
import { LayoutGridIcon } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { ResultWizard, getMockOptions } from "@/features/mock-exams";
import { requireRole } from "@/lib/auth";
import { requireModule } from "@/modules/get-enabled-modules";

export const metadata: Metadata = { title: "Deneme ekle" };

/** Koç öğrenci adına deneme girer (aynı sihirbaz, `compact`); `?examId=` ile katalogdan ön seçim. */
export default async function CoachNewExamPage({
  params,
  searchParams,
}: PageProps<"/coach/students/[studentId]/exams/new">) {
  const { studentId } = await params;
  const { examId } = await searchParams;
  await requireRole("coach", "owner");
  await requireModule(studentId, "mock-exams");
  const options = await getMockOptions(studentId);

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-heading font-semibold text-ink-900">Deneme ekle</h2>
      {options ? (
        <ResultWizard
          studentId={studentId}
          audience="coach"
          options={options}
          initial={null}
          preselectExamId={typeof examId === "string" ? examId : null}
          basePath={`/coach/students/${studentId}/exams`}
        />
      ) : (
        <EmptyState
          icon={LayoutGridIcon}
          title="Konu listesi atanmamış"
          description="Deneme girmek için öğrenciye önce bir müfredat şablonu atanmalı."
          action={
            <Button asChild variant="secondary">
              <Link href="/coach/templates">Şablon ata</Link>
            </Button>
          }
        />
      )}
    </div>
  );
}
