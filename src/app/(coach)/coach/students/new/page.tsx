import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeftIcon } from "lucide-react";
import { CreateStudentForm, listCoaches } from "@/features/core";
import { listTemplates } from "@/features/topics";
import { requireRole } from "@/lib/auth";
import { currentSeason } from "@/lib/dates";

export const metadata: Metadata = { title: "Yeni öğrenci" };

export default async function NewStudentPage() {
  const { profile } = await requireRole("coach", "owner");
  const [coaches, templates] = await Promise.all([
    profile.role === "owner" ? listCoaches() : Promise.resolve([]),
    listTemplates(),
  ]);

  return (
    <>
      <header className="flex flex-col gap-2">
        <Link
          href="/coach/students"
          className="inline-flex items-center gap-1 text-small text-ink-500 hover:text-ink-900"
        >
          <ArrowLeftIcon className="size-4" aria-hidden="true" />
          Öğrenciler
        </Link>
        <h1 className="text-title font-semibold tracking-tight">Yeni öğrenci</h1>
        <p className="max-w-prose text-small text-ink-500">
          Öğrenci kullanıcı adı ve geçici şifreyle giriş yapar; e-posta gerekmez.
        </p>
      </header>
      <CreateStudentForm
        coaches={coaches.map((c) => ({ id: c.id, fullName: c.fullName }))}
        defaultSeason={currentSeason()}
        templates={templates.map((t) => ({ id: t.id, name: t.name, examDate: t.examDate }))}
      />
    </>
  );
}
