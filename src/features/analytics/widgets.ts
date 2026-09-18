import { defineWidgets } from "@/modules/define-module";
import { TopicNudgeWidget } from "./components/widgets/topic-nudge-widget";

/** Bugün kartı: yan sütun, haftalık ders çubuklarından (20) sonra, konu kartından (30) önce. */
export const analyticsWidgets = defineWidgets({
  moduleId: "analytics",
  studentToday: [{ component: TopicNudgeWidget, order: 25, column: "side" }],
});
