import { defineWidgets } from "@/modules/define-module";
import { PlanTodayWidget } from "./components/widgets/plan-today-widget";

/** Bugün kartı: hedef halkasından (10) sonra, kayıtlardan (20) önce (04 §8.2 S1 sırası). */
export const plannerWidgets = defineWidgets({
  moduleId: "planner",
  studentToday: [{ component: PlanTodayWidget, order: 15, column: "main" }],
});
