/** `topics` modülü dışa açık API'si. */
export { topicsModule } from "./module";
export { topicsWidgets } from "./widgets";
export { TopicMap, TopicLegend } from "./components/topic-map";
export { TemplateEditor } from "./components/template-editor";
export { TemplateCalendar } from "./components/template-calendar";
export { setTopicSchoolDates } from "./server/actions";
export { setTopicSchoolDatesSchema, type SetTopicSchoolDatesInput } from "./schemas";
export {
  getTopicMap,
  getTemplateEditor,
  getTopicCompletionSummary,
  listTemplates,
} from "./server/queries";
export type {
  TopicMap as TopicMapData,
  TemplateEditor as TemplateEditorData,
  TemplateOption,
} from "./types";
export { completionPercent, countDone, percentOf } from "./lib/completion";
