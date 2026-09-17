import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { alertReason, getTopicAlerts } from "@/features/analytics";
import { getStudentHeader, listStudents } from "@/features/core";
import {
  PlanBuilder,
  PlanPrintSheet,
  alertsToPoolItems,
  buildTaskPool,
  getExistingItemCounts,
  getFrequentTasks,
  getPlanCompletion,
  getPlanOptions,
  getWeekPlan,
  type CopyTarget,
} from "@/features/planner";
import { getWeekAvailability } from "@/features/schedule";
import { requireRole } from "@/lib/auth";
import { resolveWeekParam, shiftWeek, weekDates } from "@/lib/dates";
import { requireModule } from "@/modules/get-enabled-modules";

export const metadata: Metadata = { title: "Plan" };

/**
 * K3 Plan oluşturucu: `?week=YYYY-MM-DD` (pazartesi; yoksa bu hafta). Veri tek seferde
 * toplanır; her değişiklik Server Action + `router.refresh()` ile bu sayfayı yeniler.
 */
export default async function CoachPlanPage({
  params,
  searchParams,
}: PageProps<"/coach/students/[studentId]/plan">) {
  const { studentId } = await params;
  const { week: weekParam } = await searchParams;
  const { userId } = await requireRole("coach", "owner");
  await requireModule(studentId, "planner");
  const week = resolveWeekParam(typeof weekParam === "string" ? weekParam : undefined);
  const prevWeek = shiftWeek(week, -1);
  const nextWeek = shiftWeek(week, 1);

  const [student, plan, days, options, frequent, students, lastWeek, nextWeekPlan, alerts] =
    await Promise.all([
      getStudentHeader(studentId),
      getWeekPlan(studentId, week),
      getWeekAvailability(studentId, week),
      getPlanOptions(studentId),
      getFrequentTasks(userId),
      listStudents(),
      getPlanCompletion(studentId, prevWeek),
      getPlanCompletion(studentId, nextWeek),
      getTopicAlerts(studentId),
    ]);
  if (!student) notFound();

  const others = students.filter((s) => s.profileId !== studentId && s.status === "active");
  const existing = await getExistingItemCounts(
    others.map((s) => s.profileId),
    week,
  );
  const otherStudents: CopyTarget[] = others.map((s) => ({
    studentId: s.profileId,
    fullName: s.fullName,
    existingItems: existing[s.profileId] ?? 0,
  }));
  // Görevler değişince istemci durumu sıfırdan kurulsun (iyimser sıralama sunucuyla eşitlenir).
  const version = plan
    ? `${plan.id}:${plan.status}:${plan.items
        .map(
          (i) => `${i.id}${i.dayOfWeek}${i.sortOrder}${i.completedAt ?? ""}${i.postponedAt ?? ""}`,
        )
        .join("|")}`
    : "none";

  return (
    <>
      <PlanBuilder
        key={version}
        studentId={studentId}
        studentName={student.fullName}
        weekStart={week}
        prevWeek={prevWeek}
        nextWeek={nextWeek}
        basePath={`/coach/students/${studentId}/plan`}
        plan={plan}
        days={days}
        options={options}
        pool={buildTaskPool({
          ...alertsToPoolItems(alerts, { ...options, reason: alertReason }),
          frequent,
        })}
        otherStudents={otherStudents}
        lastWeekPlan={lastWeek ? { id: lastWeek.planId, items: lastWeek.itemsTotal } : null}
        nextWeekExisting={nextWeekPlan?.itemsTotal ?? 0}
      />
      <PlanPrintSheet
        studentName={student.fullName}
        weekStart={week}
        dates={weekDates(week)}
        items={plan?.items ?? []}
        coachMessage={plan?.coachMessage ?? null}
      />
    </>
  );
}
