/**
 * `planner` modülü dışa açık API'si. İstemci bileşenleri bu dosyayı import etmez (sunucu
 * dosyaları da dışa açılır); sayfalar ve diğer modüllerin sunucu kodu buradan alır.
 */
export { plannerModule } from "./module";
export { plannerWidgets } from "./widgets";
export { PlanBuilder, type PlanBuilderProps } from "./components/plan-builder";
export { StudentPlan } from "./components/student-plan";
export { PlanPrintSheet } from "./components/plan-print-sheet";
export { PrintButton } from "./components/print-button";
export { PlanCompletionTile } from "./components/plan-completion-tile";
export { AddSuggestionButton } from "./components/add-suggestion-button";
export type { CopyTarget } from "./components/copy-plan-dialog";
export {
  getWeekPlan,
  getTodayPlanItems,
  getPlanOptions,
  getFrequentTasks,
  getResourcePoolRows,
  getVideoPoolRows,
  getPlanCompletion,
  listCoachPlans,
  getExistingItemCounts,
} from "./server/queries";
export { buildTaskPool } from "./lib/pool";
export { alertsToPoolItems, suggestionsToPoolItems } from "./lib/alert-pool";
export {
  alertPriorityByTopic,
  sectionsToPoolItems,
  videosToPoolItems,
  videoMinutes,
  type SectionPoolRow,
  type VideoPoolRow,
} from "./lib/media-pool";
export { completionPercent, weekTotals } from "./lib/plan-summary";
export type {
  PlanItem,
  WeekPlan,
  PlanCompletion,
  CoachPlanRow,
  TaskPoolCategory,
  TaskPoolItem,
  TaskPoolCategoryId,
  PoolTask,
} from "./types";
