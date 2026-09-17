import { defineWidgets } from "@/modules/define-module";
import { StudentTodayWidget } from "./components/widgets/student-today-widget";

export const topicsWidgets = defineWidgets({
  moduleId: "topics",
  studentToday: [{ component: StudentTodayWidget, order: 30, column: "side" }],
});
