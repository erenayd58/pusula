import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeftIcon } from "lucide-react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { ResultDetail, ResultWizard, getMockOptions, getResultDetail } from "@/features/mock-exams";
import { requireRole } from "@/lib/auth";
import { requireModule } from "@/modules/get-enabled-modules";

export const metadata: Metadata = { title: "Deneme" };

/** Koç: öğrencinin deneme detayı; `?edit=1` sihirbazı dolu açar. RLS satır vermezse 404. */
export default async function CoachExamDetailPage({
  params,
  searchParams,
}: PageProps<"/coach/students/[studentId]/exams/[resultId]">) {
  const { studentId, resultId } = await params;
  const { edit } = await searchParams;
  if (!z.uuid().safeParse(resultId).success) notFound();
  await requireRole("coach", "owner");
  await requireModule(studentId, "mock-exams");
  const base = `/coach/students/${studentId}/exams`;
  const result = await getResultDetail(resultId);
  if (!result || result.studentId !== studentId) notFound();
  const editing = edit === "1";
  const options = editing ? await getMockOptions(studentId) : null;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Button asChild variant="ghost" className="w-fit">
          <Link href={base}>
            <ChevronLeftIcon aria-hidden="true" />
            Denemeler
          </Link>
        </Button>
        <h2 className="text-heading font-semibold text-ink-900">
          {editing ? "Denemeyi düzenle" : result.title}
        </h2>
      </div>
      {editing && options ? (
        <ResultWizard
          studentId={studentId}
          audience="coach"
          options={options}
          initial={result}
          preselectExamId={null}
          basePath={base}
        />
      ) : (
        <ResultDetail result={result} basePath={base} canEdit />
      )}
    </div>
  );
}
