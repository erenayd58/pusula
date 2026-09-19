import { defineWidgets } from "@/modules/define-module";
import { ParentLastNoteWidget } from "./components/widgets/parent-last-note-widget";

/** Veli Özet: koçun veliye açık son notu (order 70, en altta; 04 §8.3 V1 sırası). */
export const coachNotesWidgets = defineWidgets({
  moduleId: "coach-notes",
  parentSummary: [{ component: ParentLastNoteWidget, order: 70 }],
});
