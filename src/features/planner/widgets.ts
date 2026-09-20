import { defineWidgets } from "@/modules/define-module";
import { ParentPlanWidget } from "./components/widgets/parent-plan-widget";
import { PlanTodayWidget } from "./components/widgets/plan-today-widget";

/** Bugün kartı: hedef halkasından (10) sonra, kayıtlardan (20) önce (04 §8.2 S1 sırası). Veli: plan uyumu en üstte (10). */
export const plannerWidgets = defineWidgets({
  moduleId: "planner",
  studentToday: [{ component: PlanTodayWidget, order: 15, column: "main" }],
  parentSummary: [{ component: ParentPlanWidget, order: 10 }],
});
