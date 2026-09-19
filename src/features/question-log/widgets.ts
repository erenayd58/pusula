import { defineWidgets } from "@/modules/define-module";
import { ParentSubjectWeekWidget } from "./components/widgets/parent-subject-week-widget";
import { ParentWeekStatsWidget } from "./components/widgets/parent-week-stats-widget";
import { TodayLogsWidget } from "./components/widgets/today-logs-widget";
import { WeekSubjectsWidget } from "./components/widgets/week-subjects-widget";

export const questionLogWidgets = defineWidgets({
  moduleId: "question-log",
  studentToday: [
    { component: TodayLogsWidget, order: 20, column: "main" },
    { component: WeekSubjectsWidget, order: 20, column: "side" },
  ],
  // Veli Özet (Faz 8): soru/süre kutuları 20, ders dağılımı 50 (V1 sırası).
  parentSummary: [
    { component: ParentWeekStatsWidget, order: 20 },
    { component: ParentSubjectWeekWidget, order: 50 },
  ],
});
