import type { Metadata } from "next";
import Link from "next/link";
import { PlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AttentionList,
  SuggestionList,
  alertToTask,
  getSuggestions,
  getTopicAlerts,
} from "@/features/analytics";
import { StudentTable, getOrgSettings, listCoaches, listStudents } from "@/features/core";
import { AddSuggestionButton } from "@/features/planner";
import { requireRole } from "@/lib/auth";
import { toDateKey, todayInIstanbul, weekStart } from "@/lib/dates";
import { formatDateTr } from "@/lib/format";

export const metadata: Metadata = { title: "Öğrenciler" };

/**
 * K1 Öğrenciler: başlık, "Dikkat gerektirenler" (acil müdahale) ve "Öneriler" (plana
 * eklenebilecekler; öğrenci başına 3 açık, gerisi "Tümünü gör"), liste (karar A12). Uyarı ve
 * öneriler tek sorguyla görünen tüm öğrenciler için; sıradaki konu (`not_started`) dikkat
 * gerektirmez; dikkat listesindeki öğrenci + konu + tür öneri listesinde tekrar etmez. Her iki
 * listenin `action` yuvasında planner'ın "Plana ekle" düğmesi (bu haftanın taslağına yazar;
 * analytics planner'ı import etmez, sayfa takar).
 */
export default async function StudentsPage() {
  const { profile } = await requireRole("coach", "owner");
  const [students, coaches, alerts, suggestions, settings] = await Promise.all([
    listStudents(),
    profile.role === "owner" ? listCoaches() : Promise.resolve([]),
    getTopicAlerts(),
    getSuggestions(),
    getOrgSettings(),
  ]);
  const active = new Set(students.filter((s) => s.status === "active").map((s) => s.profileId));
  const attention = alerts.filter((a) => a.kind !== "not_started" && active.has(a.studentId));
  // Aynı öğrenci + konu + tür iki bölümde birden görünmesin: dikkat listesi öncelikli.
  const attentionKeys = new Set(
    attention.map((a) => `${a.studentId}:${a.kind}:${a.subject.id}:${a.topicId ?? ""}`),
  );
  const activeSuggestions = suggestions.filter(
    (s) =>
      active.has(s.studentId) &&
      !attentionKeys.has(`${s.studentId}:${s.kind}:${s.subjectId}:${s.topicId ?? ""}`),
  );
  const studentNames = new Map(students.map((s) => [s.profileId, s.fullName]));
  const week = toDateKey(weekStart(todayInIstanbul()));

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
        <>
          <AttentionList
            alerts={attention}
            studentNames={studentNames}
            description="Acil müdahale gerektiren konular; her satır plana eklenebilir."
            action={(a) => (
              <AddSuggestionButton
                studentId={a.studentId}
                weekStart={week}
                weekLabel="Bu hafta"
                task={{
                  ...alertToTask(a, settings.planner),
                  subjectId: a.subject.id,
                  topicId: a.topicId,
                }}
              />
            )}
          />
          <SuggestionList
            suggestions={activeSuggestions}
            studentNames={studentNames}
            dismissDays={settings.suggestions.dismiss_days}
            description="Bu hafta plana eklenebilecek konular; dikkat listesindekiler burada tekrar etmez."
            visiblePerGroup={3}
            action={(s) => (
              <AddSuggestionButton
                studentId={s.studentId}
                weekStart={week}
                weekLabel="Bu hafta"
                task={{ ...s.task, subjectId: s.subjectId, topicId: s.topicId }}
              />
            )}
          />
        </>
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
