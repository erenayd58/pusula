import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ExamDateForm, getStudentHeader } from "@/features/core";
import { GoalForm, getActiveGoals } from "@/features/goals";
import { PlanCompletionTile, getPlanCompletion, getWeekPlan } from "@/features/planner";
import { CoachOverview } from "@/features/question-log";
import { requireRole } from "@/lib/auth";
import { shiftWeek, toDateKey, todayInIstanbul, weekStart } from "@/lib/dates";
import { getEnabledModules } from "@/modules/get-enabled-modules";

export const metadata: Metadata = { title: "Genel bakış" };

/**
 * K2 Genel bakış (flat): bugün/bu hafta soru, hedef durumu, son 14 gün çubukları (question-log
 * açıksa); hedef formu (goals açıksa); sınav tarihi. Deneme, plan ve tekrar özetleri kendi
 * fazlarında eklenir.
 */
export default async function OverviewPage({ params }: PageProps<"/coach/students/[studentId]">) {
  const { studentId } = await params;
  await requireRole("coach", "owner");
  const [student, enabled] = await Promise.all([
    getStudentHeader(studentId),
    getEnabledModules(studentId),
  ]);
  if (!student) notFound();
  const goalsOn = enabled.has("goals");
  const logsOn = enabled.has("question-log");
  const plannerOn = enabled.has("planner");
  const week = toDateKey(weekStart(todayInIstanbul()));
  const lastWeek = shiftWeek(week, -1);
  const [goals, planThisWeek, planLastWeek, lastWeekPlan] = await Promise.all([
    goalsOn ? getActiveGoals(studentId) : Promise.resolve({ daily: null, weekly: null }),
    plannerOn ? getPlanCompletion(studentId, week) : Promise.resolve(null),
    plannerOn ? getPlanCompletion(studentId, lastWeek) : Promise.resolve(null),
    plannerOn ? getWeekPlan(studentId, lastWeek) : Promise.resolve(null),
  ]);

  return (
    <div className="flex flex-col gap-6">
      {logsOn ? (
        <CoachOverview studentId={studentId} goals={goals} />
      ) : (
        <p className="rounded-sm border border-line bg-bg-paper p-4 text-small text-ink-700">
          Soru Takibi modülü kapalı; soru özetleri için Modüller sekmesinden açın.
        </p>
      )}

      {plannerOn ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <PlanCompletionTile thisWeek={planThisWeek} lastWeek={planLastWeek} />
          {lastWeekPlan?.studentReflection ? (
            <div className="flex flex-col gap-0.5 rounded-sm border border-line bg-bg-paper px-4 py-3 sm:col-span-1 lg:col-span-2">
              <span className="text-micro-lg text-ink-500">
                Öğrencinin geçen hafta değerlendirmesi
              </span>
              <p className="text-small text-ink-900">“{lastWeekPlan.studentReflection}”</p>
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        {goalsOn ? (
          <section className="flex flex-col gap-3 rounded-sm border border-line bg-bg-paper p-4">
            <h2 className="text-heading font-semibold text-ink-900">Hedefler</h2>
            <GoalForm studentId={studentId} initial={goals} />
          </section>
        ) : null}
        <section className="flex flex-col gap-3 rounded-sm border border-line bg-bg-paper p-4">
          <h2 className="text-heading font-semibold text-ink-900">Sınav</h2>
          <ExamDateForm studentId={studentId} examDate={student.examDate} />
        </section>
      </div>
    </div>
  );
}
