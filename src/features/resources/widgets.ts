import { defineWidgets } from "@/modules/define-module";
import { ParentResourceWidget } from "./components/widgets/parent-resource-widget";

/** Veli Özet: kaynak ilerlemesi (order 60; Faz 8, E9). */
export const resourcesWidgets = defineWidgets({
  moduleId: "resources",
  parentSummary: [{ component: ParentResourceWidget, order: 60 }],
});
