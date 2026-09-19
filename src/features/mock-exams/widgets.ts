import { defineWidgets } from "@/modules/define-module";
import { ParentLastResultWidget } from "./components/widgets/parent-last-result-widget";

/** Veli Özet: son genel deneme kartı (order 40; Faz 8 sırası: plan 10, soru/süre 20, gidişat 30). */
export const mockExamsWidgets = defineWidgets({
  moduleId: "mock-exams",
  parentSummary: [{ component: ParentLastResultWidget, order: 40 }],
});
