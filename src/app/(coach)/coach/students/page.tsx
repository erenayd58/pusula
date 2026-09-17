import type { Metadata } from "next";
import Link from "next/link";
import { PlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StudentTable, listCoaches, listStudents } from "@/features/core";
import { requireRole } from "@/lib/auth";
import { formatDateTr } from "@/lib/format";

export const metadata: Metadata = { title: "Öğrenciler" };

/** K1 Öğrenciler: başlık + liste. Arama, filtre ve dikkat gerektirenler Faz 3. */
export default async function StudentsPage() {
  const { profile } = await requireRole("coach", "owner");
  const [students, coaches] = await Promise.all([
    listStudents(),
    profile.role === "owner" ? listCoaches() : Promise.resolve([]),
  ]);

  return (
    <>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-title font-semibold tracking-tight">Öğrenciler</h1>
          <p className="text-small text-ink-500">
            {formatDateTr(new Date(), { weekday: true, year: true })}
          </p>
        </div>
        <Button asChild>
          <Link href="/coach/students/new">
            <PlusIcon aria-hidden="true" />
            Yeni öğrenci
          </Link>
        </Button>
      </header>
      <StudentTable
        students={students}
        viewerRole={profile.role}
        coaches={coaches
          .filter((c) => c.role === "coach")
          .map((c) => ({ id: c.id, fullName: c.fullName }))}
      />
    </>
  );
}
