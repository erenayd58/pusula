import type { Metadata } from "next";
import {
  AvailabilitySummary,
  ScheduleEditor,
  availabilityForWeek,
  getScheduleForEditor,
  wakeInterval,
} from "@/features/schedule";
import { requireRole } from "@/lib/auth";
import { toDateKey, todayInIstanbul, weekStart } from "@/lib/dates";
import { requireModule } from "@/modules/get-enabled-modules";

export const metadata: Metadata = { title: "Haftalık programım" };

/**
 * Haftalık program (08 §2 Parça 1): sabit meşguliyetler ve istisnalar, basit liste (saat
 * ızgarası yok); üstte bu haftanın müsait süresi. Menüde yok; "Ben" sayfasından gelinir.
 */
export default async function SchedulePage() {
  const { userId } = await requireRole("student");
  await requireModule(userId, "schedule");
  const schedule = await getScheduleForEditor(userId);
  const monday = toDateKey(weekStart(todayInIstanbul()));
  const days = availabilityForWeek({
    weekStart: monday,
    wake: wakeInterval({ wake_start: schedule.wake.start, wake_end: schedule.wake.end }),
    slots: schedule.slots,
    exceptions: schedule.exceptions,
  });

  return (
    <>
      <header className="flex flex-col gap-1">
        <h1 className="text-title font-semibold tracking-tight lg:text-title-lg">
          Haftalık programım
        </h1>
        <p className="text-small text-ink-500">
          Meşgul olduğun saatleri gir; koçun planı kalan zamana göre hazırlar.
        </p>
      </header>
      <AvailabilitySummary days={days} wake={schedule.wake} />
      <ScheduleEditor studentId={userId} audience="student" schedule={schedule} />
    </>
  );
}
