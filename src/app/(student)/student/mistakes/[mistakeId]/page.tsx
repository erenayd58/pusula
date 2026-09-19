import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeftIcon } from "lucide-react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { MistakeDetail, MistakeForm, getMistake, getMistakeOptions } from "@/features/mistakes";
import { requireRole } from "@/lib/auth";
import { getEnabledModules } from "@/modules/get-enabled-modules";

export const metadata: Metadata = { title: "Yanlış kaydı" };

const BASE = "/student/mistakes";

/** Kayıt detayı; `?edit=1` formu dolu açar (fotoğraf değişmez). RLS satır vermezse 404. */
export default async function MistakeDetailPage({
  params,
  searchParams,
}: PageProps<"/student/mistakes/[mistakeId]">) {
  const { mistakeId } = await params;
  const { edit } = await searchParams;
  if (!z.uuid().safeParse(mistakeId).success) notFound();
  const { userId } = await requireRole("student");
  const enabled = await getEnabledModules(userId);
  if (!enabled.has("mistakes")) notFound();
  const mistake = await getMistake(mistakeId);
  if (!mistake || mistake.studentId !== userId) notFound();
  const editing = edit === "1";
  const options = editing ? await getMistakeOptions(userId) : null;

  return (
    <>
      <header className="flex flex-col gap-2">
        <Button asChild variant="ghost" className="w-fit">
          <Link href={BASE}>
            <ChevronLeftIcon aria-hidden="true" />
            Yanlış defterim
          </Link>
        </Button>
        <h1 className="text-title font-semibold tracking-tight lg:text-title-lg">
          {editing ? "Kaydı düzenle" : (mistake.topicName ?? mistake.subjectName)}
        </h1>
      </header>
      {editing && options ? (
        <MistakeForm
          studentId={userId}
          options={options}
          initial={mistake}
          prefill={{}}
          basePath={BASE}
        />
      ) : (
        <MistakeDetail
          mistake={mistake}
          basePath={BASE}
          examsPath={enabled.has("mock-exams") ? "/student/exams" : null}
        />
      )}
    </>
  );
}
