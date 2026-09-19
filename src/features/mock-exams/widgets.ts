import { defineWidgets } from "@/modules/define-module";
import { ParentLastResultWidget } from "./components/widgets/parent-last-result-widget";

/** Veli Özet: son genel deneme kartı (order 30; Faz 8 plan uyumu 10, soru/süre 20 önüne gelir). */
export const mockExamsWidgets = defineWidgets({
  moduleId: "mock-exams",
  parentSummary: [{ component: ParentLastResultWidget, order: 30 }],
});
