/**
 * `mock-exams` modülü dışa açık API'si (Faz 6a). İstemci bileşenleri bu dosyayı import etmez
 * (sunucu dosyaları da dışa açılır).
 */
export { mockExamsModule } from "./module";
export { ResultWizard } from "./components/result-wizard";
export { NetTrendChart } from "./components/net-trend-chart";
export { ResultCardList } from "./components/result-card-list";
export { LastResultCards } from "./components/last-result-cards";
export { TopMistakeTopics } from "./components/top-mistake-topics";
export { ResultList } from "./components/result-list";
export { ResultDetail } from "./components/result-detail";
export { MockExamCatalog } from "./components/mock-exam-catalog";
export { ExamComparisonTable } from "./components/exam-comparison-table";
export { SubjectProgressTable } from "./components/subject-progress-table";
export { LastMockTile } from "./components/last-mock-tile";
export {
  getMockOptions,
  listCatalogTemplates,
  listMockExams,
  getMockExam,
  listStudentResults,
  getResultDetail,
  getTrend,
  getTopicMarkCounts,
  getSubjectProgress,
  getExamComparison,
} from "./server/queries";
export { upsertMockExam, deleteMockExam, saveMockResult, deleteMockResult } from "./server/actions";
export {
  mockExamSchema,
  saveMockResultSchema,
  deleteMockResultSchema,
  deleteMockExamSchema,
  type MockExamInput,
  type SaveMockResultInput,
} from "./schemas";
export type {
  MockExam,
  MockOptions,
  MockSubject,
  MockResultSummary,
  MockResultDetail,
  SubjectNetRow,
  TrendData,
  TopicMarkRow,
  SubjectProgressRow,
  ComparisonRow,
  ExamComparison,
  CatalogTemplate,
} from "./types";
