import { defineWidgets } from "@/modules/define-module";
import { ParentPaceWidget } from "./components/widgets/parent-pace-widget";
import { StudentTodayWidget } from "./components/widgets/student-today-widget";

export const topicsWidgets = defineWidgets({
  moduleId: "topics",
  studentToday: [{ component: StudentTodayWidget, order: 30, column: "side" }],
  // Veli Özet (Faz 8): gidişat cümlesi (30), soru/süre (20) ile son deneme (40) arasında.
  parentSummary: [{ component: ParentPaceWidget, order: 30 }],
});
