import type { Metadata } from "next";
import Link from "next/link";
import { PlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AttentionList, getTopicAlerts } from "@/features/analytics";
import { StudentTable, listCoaches, listStudents } from "@/features/core";
import { requireRole } from "@/lib/auth";
import { formatDateTr } from "@/lib/format";

export const metadata: Metadata = { title: "Öğrenciler" };

/**
 * K1 Öğrenciler: başlık, "Dikkat gerektirenler" (karar A12; Parça 4'te "Öneriler" de buraya),
 * liste. Uyarılar tek sorguyla görünen tüm öğrenciler için; sıradaki konu (`not_started`)
 * dikkat gerektirmez, listeye girmez. Parça 4 `action` yuvasına "Plana ekle" takar.
 */
export default async function StudentsPage() {
  const { profile } = await requireRole("coach", "owner");
  const [students, coaches, alerts] = await Promise.all([
    listStudents(),
    profile.role === "owner" ? listCoaches() : Promise.resolve([]),
    getTopicAlerts(),
  ]);
  const active = new Set(students.filter((s) => s.status === "active").map((s) => s.profileId));
  const attention = alerts.filter((a) => a.kind !== "not_started" && active.has(a.studentId));
  const studentNames = new Map(students.map((s) => [s.profileId, s.fullName]));

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
      {students.length > 0 ? (
        <AttentionList alerts={attention} studentNames={studentNames} />
      ) : null}
      <section aria-labelledby="students-heading" className="flex flex-col gap-3">
        <h2 id="students-heading" className="text-heading font-semibold text-ink-900">
          Tüm öğrenciler
        </h2>
        <StudentTable
          students={students}
          viewerRole={profile.role}
          coaches={coaches
            .filter((c) => c.role === "coach")
            .map((c) => ({ id: c.id, fullName: c.fullName }))}
        />
      </section>
    </>
  );
}
