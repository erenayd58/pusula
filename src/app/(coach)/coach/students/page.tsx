import type { Metadata } from "next";
import Link from "next/link";
import { PlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StudentTable, listCoaches, listStudents } from "@/features/core";
import { requireRole } from "@/lib/auth";

export const metadata: Metadata = { title: "Öğrenciler" };

/** Basit liste + eylemler; kabuk ve gerçek liste Faz 1c'de. */
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
          <p className="text-small text-ink-500">
            <Link href="/coach" className="hover:text-ink-900">
              Koç paneli
            </Link>
          </p>
          <h1 className="text-title font-semibold tracking-tight">Öğrenciler</h1>
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
