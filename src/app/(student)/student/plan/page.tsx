import type { Metadata } from "next";
import Link from "next/link";
import { CalendarDaysIcon, ChevronLeftIcon, ChevronRightIcon, PrinterIcon } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { getStudentHeader } from "@/features/core";
import { PlanPrintSheet, PrintButton, StudentPlan, getWeekPlan } from "@/features/planner";
import { requireRole } from "@/lib/auth";
import {
  isoDayOfWeek,
  resolveWeekParam,
  shiftWeek,
  toDateKey,
  todayInIstanbul,
  weekDates,
  weekStart,
} from "@/lib/dates";
import { formatCount, formatWeekRange } from "@/lib/format";
import { requireModule } from "@/modules/get-enabled-modules";

export const metadata: Metadata = { title: "Haftalık plan" };

/**
 * S4 Haftalık plan: `?week=` ile haftalar gezilir (yalnızca yayınlanmış planlar görünür, RLS).
 * Değerlendirme alanı: bu hafta cumartesiden itibaren düzenlenebilir, geçmiş haftalarda salt
 * okunur, gelecek haftada gizli (karar A9).
 */
export default async function StudentPlanPage({ searchParams }: PageProps<"/student/plan">) {
  const { week: weekParam } = await searchParams;
  const { userId } = await requireRole("student");
  await requireModule(userId, "planner");
  const week = resolveWeekParam(typeof weekParam === "string" ? weekParam : undefined);
  const now = todayInIstanbul();
  const currentWeek = toDateKey(weekStart(now));
  const [plan, student] = await Promise.all([getWeekPlan(userId, week), getStudentHeader(userId)]);
  const coachName = student?.coachName ?? null;
  const isCurrent = week === currentWeek;
  const isPast = week < currentWeek;
  const todayDay = isCurrent ? isoDayOfWeek(now) : null;
  const reflectionMode = isPast
    ? "readonly"
    : isCurrent && (todayDay ?? 0) >= 6
      ? "editable"
      : "hidden";
  const markedDays = plan
    ? new Set(plan.items.map((i) => i.dayOfWeek).filter((d): d is number => d !== null)).size
    : 0;

  return (
    <>
      <header className="flex flex-col gap-3 print:hidden">
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col gap-1">
            <h1 className="text-title font-semibold tracking-tight lg:text-title-lg">
              Haftalık plan
            </h1>
            <p className="text-small text-ink-500">
              {formatWeekRange(week)}
              {plan ? ` · ${formatCount(markedDays, "gün")} işaretli` : ""}
            </p>
          </div>
          <nav aria-label="Hafta seçici" className="flex items-center gap-1">
            <Button asChild variant="secondary" size="icon" aria-label="Önceki hafta">
              <Link href={`/student/plan?week=${shiftWeek(week, -1)}`}>
                <ChevronLeftIcon aria-hidden="true" />
              </Link>
            </Button>
            <Button asChild variant="secondary" size="icon" aria-label="Sonraki hafta">
              <Link href={`/student/plan?week=${shiftWeek(week, 1)}`}>
                <ChevronRightIcon aria-hidden="true" />
              </Link>
            </Button>
            {plan ? (
              <PrintButton>
                <PrinterIcon aria-hidden="true" />
              </PrintButton>
            ) : null}
          </nav>
        </div>
      </header>

      {!plan ? (
        <EmptyState
          icon={CalendarDaysIcon}
          title={isCurrent ? "Bu hafta için plan yok" : "Bu haftada plan yok"}
          description={
            isCurrent
              ? "Koçun planı yayınlayınca görevlerin burada görünecek. Programını güncel tutarsan plan sana daha iyi uyar."
              : "Başka bir haftaya bak."
          }
          action={
            <Button asChild variant="secondary">
              <Link href="/student/schedule">Programını düzenle</Link>
            </Button>
          }
        />
      ) : (
        <>
          <StudentPlan
            plan={plan}
            dates={weekDates(week)}
            todayDay={todayDay}
            coachName={coachName}
            reflectionMode={reflectionMode}
          />
          <PlanPrintSheet
            studentName={student?.fullName ?? ""}
            weekStart={week}
            dates={weekDates(week)}
            items={plan.items}
            coachMessage={plan.coachMessage}
          />
        </>
      )}
    </>
  );
}
