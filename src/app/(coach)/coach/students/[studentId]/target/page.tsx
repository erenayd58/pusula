import type { Metadata } from "next";
import Link from "next/link";
import { TZDate } from "@date-fns/tz";
import { addWeeks } from "date-fns";
import { LayoutGridIcon } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { getOrgSettings } from "@/features/core";
import {
  TargetForm,
  TopicTargetList,
  WeeklyGoalSuggestion,
  getActiveGoals,
  getStudentTargets,
  getWeeklyAvailableMinutes,
} from "@/features/goals";
import { requireRole } from "@/lib/auth";
import { TIME_ZONE, daysUntil, toDateKey, todayInIstanbul } from "@/lib/dates";
import { requireModule } from "@/modules/get-enabled-modules";

export const metadata: Metadata = { title: "Hedef" };

/**
 * K2 "Hedef" sekmesi (Faz 5b, karar B6): sınava kadar soru hedefi + konuları bitirme tarihi +
 * geri planlanmış konu takvimi (`TargetForm`), konu listesi (`TopicTargetList`), haftalık hedef
 * önerisi (`WeeklyGoalSuggestion`, karar B13). Gerçekçilik girdileri: bitmemiş konu dakikası,
 * kurum soru temposu, istisnasız haftanın müsait süresi × doluluk oranı.
 */
export default async function TargetPage({
  params,
}: PageProps<"/coach/students/[studentId]/target">) {
  const { studentId } = await params;
  await requireRole("coach", "owner");
  await requireModule(studentId, "goals");
  const [targets, settings, weeklyAvailableMinutes, goals] = await Promise.all([
    getStudentTargets(studentId),
    getOrgSettings(),
    getWeeklyAvailableMinutes(studentId),
    getActiveGoals(studentId),
  ]);

  if (!targets) {
    return (
      <EmptyState
        icon={LayoutGridIcon}
        title="Konu listesi atanmamış"
        description="Hedef kurmak için öğrenciye önce bir müfredat şablonu atanmalı."
        action={
          <Button asChild variant="secondary">
            <Link href="/coach/templates">Şablon ata</Link>
          </Button>
        }
      />
    );
  }

  const today = toDateKey(todayInIstanbul());
  const daysToExam = targets.examDate ? daysUntil(targets.examDate) : null;
  const weeksToExam = daysToExam === null ? 1 : Math.max(1, daysToExam / 7);
  const defaultFinishBy = targets.examDate
    ? toDateKey(
        addWeeks(
          new TZDate(targets.examDate, TIME_ZONE),
          -settings.strategy.topics_finish_weeks_before_exam,
        ),
      )
    : null;
  const questionsDone = targets.subjects.reduce((sum, s) => sum + s.questionsDone, 0);
  const questionsTarget = targets.subjects.reduce((sum, s) => sum + (s.questions ?? 0), 0);

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-4 rounded-sm border border-line bg-bg-paper p-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-heading font-semibold text-ink-900">Sınava kadar hedef</h2>
          <p className="text-small text-ink-500">
            Toplam soru ve konuları bitirme tarihi; konular bu tarihe kadar takvime yayılır. Öğrenci
            Bugün ekranında gidişatını görür.
          </p>
        </div>
        <TargetForm
          targets={targets}
          defaultFinishBy={defaultFinishBy}
          today={today}
          feasibilityBase={{
            minutesPerQuestion: settings.planner.minutes_per_question,
            weeksToExam,
            weeklyAvailableMinutes,
            remainingTopicMinutes: targets.remainingTopicMinutes,
            questionsDone,
          }}
        />
      </section>

      {targets.topicsFinishBy !== null ? (
        <WeeklyGoalSuggestion
          studentId={studentId}
          remainingQuestions={questionsTarget - questionsDone}
          weeksToExam={weeksToExam}
          currentWeekly={goals.weekly}
        />
      ) : null}

      <section className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <h2 className="text-heading font-semibold text-ink-900">Konu takvimi</h2>
          <p className="text-small text-ink-500">
            Her konunun hedef haftası; tarihi tek tek değiştirebilirsin. Okul takvimi doluysa
            yanında görünür.
          </p>
        </div>
        <TopicTargetList targets={targets} today={today} />
      </section>
    </div>
  );
}
