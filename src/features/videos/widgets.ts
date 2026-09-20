import { defineWidgets } from "@/modules/define-module";
import { ParentVideoWidget } from "./components/widgets/parent-video-widget";

/** Veli Özet: video ilerlemesi (order 61; Faz 8, E9). */
export const videosWidgets = defineWidgets({
  moduleId: "videos",
  parentSummary: [{ component: ParentVideoWidget, order: 61 }],
});
