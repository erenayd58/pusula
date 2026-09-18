import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getStudentHeader } from "@/features/core";
import {
  AvailabilitySummary,
  ScheduleEditor,
  WakeWindowForm,
  availabilityForWeek,
  getScheduleForEditor,
  wakeInterval,
} from "@/features/schedule";
import { requireRole } from "@/lib/auth";
import { toDateKey, todayInIstanbul, weekStart } from "@/lib/dates";
import { requireModule } from "@/modules/get-enabled-modules";

export const metadata: Metadata = { title: "Program" };

/**
 * K2 Program sekmesi: öğrencinin programı, aynı editör (flat); koç düzenleyebilir. Başlıkta
 * uyanık aralık (Faz 5b, karar B10: öğrenci değeri yoksa kurum varsayılanı; koç düzenler).
 */
export default async function CoachStudentSchedulePage({
  params,
}: PageProps<"/coach/students/[studentId]/schedule">) {
  const { studentId } = await params;
  await requireRole("coach", "owner");
  await requireModule(studentId, "schedule");
  const [student, schedule] = await Promise.all([
    getStudentHeader(studentId),
    getScheduleForEditor(studentId),
  ]);
  if (!student) notFound();
  const monday = toDateKey(weekStart(todayInIstanbul()));
  const days = availabilityForWeek({
    weekStart: monday,
    wake: wakeInterval({ wake_start: schedule.wake.start, wake_end: schedule.wake.end }),
    slots: schedule.slots,
    exceptions: schedule.exceptions,
  });

  return (
    <div className="flex flex-col gap-6">
      <WakeWindowForm studentId={studentId} wake={schedule.wake} />
      <AvailabilitySummary days={days} wake={schedule.wake} />
      <ScheduleEditor studentId={studentId} audience="coach" schedule={schedule} />
    </div>
  );
}
