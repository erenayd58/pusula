import { defineWidgets } from "@/modules/define-module";
import { TodayLogsWidget } from "./components/widgets/today-logs-widget";
import { WeekSubjectsWidget } from "./components/widgets/week-subjects-widget";

export const questionLogWidgets = defineWidgets({
  moduleId: "question-log",
  studentToday: [
    { component: TodayLogsWidget, order: 20, column: "main" },
    { component: WeekSubjectsWidget, order: 20, column: "side" },
  ],
});
