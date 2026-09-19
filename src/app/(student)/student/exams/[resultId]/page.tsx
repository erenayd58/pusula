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

const BASE = "/student/exams";

/** Deneme detayı; `?edit=1` sihirbazı dolu açar. RLS satır vermezse 404. */
export default async function ExamDetailPage({
  params,
  searchParams,
}: PageProps<"/student/exams/[resultId]">) {
  const { resultId } = await params;
  const { edit } = await searchParams;
  if (!z.uuid().safeParse(resultId).success) notFound();
  const { userId } = await requireRole("student");
  await requireModule(userId, "mock-exams");
  const result = await getResultDetail(resultId);
  if (!result || result.studentId !== userId) notFound();
  const editing = edit === "1";
  const options = editing ? await getMockOptions(userId) : null;

  return (
    <>
      <header className="flex flex-col gap-2">
        <Button asChild variant="ghost" className="w-fit">
          <Link href={BASE}>
            <ChevronLeftIcon aria-hidden="true" />
            Denemeler
          </Link>
        </Button>
        <h1 className="text-title font-semibold tracking-tight lg:text-title-lg">
          {editing ? "Denemeyi düzenle" : result.title}
        </h1>
      </header>
      {editing && options ? (
        <ResultWizard
          studentId={userId}
          audience="student"
          options={options}
          initial={result}
          preselectExamId={null}
          basePath={BASE}
        />
      ) : (
        <ResultDetail result={result} basePath={BASE} canEdit />
      )}
    </>
  );
}
