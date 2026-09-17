import { defineWidgets } from "@/modules/define-module";
import { GoalRingWidget } from "./components/widgets/goal-ring-widget";

export const goalsWidgets = defineWidgets({
  moduleId: "goals",
  studentToday: [{ component: GoalRingWidget, order: 10, column: "main" }],
});
