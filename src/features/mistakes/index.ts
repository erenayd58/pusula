/**
 * `mistakes` modülü dışa açık API'si (Faz 6b). İstemci bileşenleri bu dosyayı import etmez
 * (sunucu dosyaları da dışa açılır). `mock-exams` bu modülü import etmez; deneme detayındaki
 * "Deftere ekle" yalnızca URL parametresiyle (`/student/mistakes/new?subjectId=&topicId=&mockResultId=`).
 */
export { mistakesModule } from "./module";
export { MistakeForm } from "./components/mistake-form";
export { MistakeList } from "./components/mistake-list";
export { MistakeDetail } from "./components/mistake-detail";
export { ReasonDistribution } from "./components/reason-distribution";
export { TopicMistakeList } from "./components/topic-mistake-list";
export {
  getMistakeOptions,
  listMistakes,
  getMistake,
  getReasonDistribution,
  getTopicMistakeCounts,
} from "./server/queries";
export { createMistake, updateMistake, setMistakeStatus, deleteMistake } from "./server/actions";
export {
  createMistakeSchema,
  updateMistakeSchema,
  setMistakeStatusSchema,
  deleteMistakeSchema,
  mistakeReasonValues,
  type CreateMistakeInput,
  type UpdateMistakeInput,
} from "./schemas";
export { BUCKET as MISTAKE_IMAGES_BUCKET } from "./lib/storage";
export { parseMistakeFilters } from "./lib/filters";
export type {
  Mistake,
  MistakeFilters,
  MistakeOptions,
  MistakeSubject,
  ReasonDistribution as ReasonDistributionData,
  TopicMistakeCount,
} from "./types";
