/** `topics` modülü dışa açık API'si. */
export { topicsModule } from "./module";
export { topicsWidgets } from "./widgets";
export { TopicMap, TopicLegend } from "./components/topic-map";
export { TemplateEditor } from "./components/template-editor";
export { TemplateCalendar } from "./components/template-calendar";
export { TemplateCopyForm } from "./components/template-copy-form";
export { setTopicSchoolDates, copyTemplate } from "./server/actions";
export {
  setTopicSchoolDatesSchema,
  copyTemplateSchema,
  type SetTopicSchoolDatesInput,
  type CopyTemplateInput,
} from "./schemas";
export {
  getTopicMap,
  getTemplateEditor,
  getTopicCompletionSummary,
  getStudentPaceSummary,
  listTemplates,
  type StudentPaceSummary,
} from "./server/queries";
export type {
  TopicMap as TopicMapData,
  TemplateEditor as TemplateEditorData,
  TemplateOption,
} from "./types";
export { completionPercent, countDone, isDone, percentOf } from "./lib/completion";
