/**
 * `analytics` modülü dışa açık API'si. İstemci bileşenleri bu dosyayı import etmez (sunucu
 * dosyaları da dışa açılır); sayfalar ve diğer modüllerin sunucu kodu buradan alır.
 * Bağımlılık yönü (08 §0): planner → analytics; analytics → planner / schedule YOK.
 */
export { analyticsModule } from "./module";
export { analyticsWidgets } from "./widgets";
export {
  evaluateTopicAlerts,
  evaluateSetupAlerts,
  groupAlerts,
  alertReason,
  alertThresholds,
  type AlertThresholds,
} from "./lib/alerts";
export { pickStudentNudge, nudgeText } from "./lib/nudge";
export {
  evaluateStudentAlerts,
  studentAlertReason,
  studentAlertAction,
  type StudentAlertThresholds,
} from "./lib/student-alerts";
export { priorityScore, SCORE_WEIGHTS, PROXIMITY_SWING } from "./lib/priority";
export {
  buildSuggestions,
  alertToTask,
  dismissalKey,
  plannedKey,
  strategyNoteFor,
  type Suggestion,
  type SuggestionTask,
  type TopicMedia,
} from "./lib/suggestions";
export {
  distributeTasks,
  type DistributeDay,
  type ExistingItem,
  type Placement,
} from "./lib/distribute";
export type {
  TopicAlertFacts,
  TopicAlert,
  AlertGroup,
  AlertSubject,
  SetupFacts,
  SetupAlert,
  SetupAlertKind,
  StudentAlert,
  StudentAlertFacts,
  StudentAlertKind,
  StudentStrategy,
} from "./types";
export { AttentionList } from "./components/attention-list";
export { WeakTopics } from "./components/weak-topics";
export { SuggestionList } from "./components/suggestion-list";
export { SetupList } from "./components/setup-list";
export { StudentAlertList } from "./components/student-alert-list";
export {
  getTopicAlertFacts,
  getTopicAlerts,
  getSuggestions,
  getStrategyContext,
  getSetupFacts,
  getSetupAlerts,
  getStudentAlertFacts,
  getStudentAlerts,
} from "./server/queries";
export { dismissSuggestion } from "./server/actions";
export { dismissSuggestionSchema, type DismissSuggestionInput } from "./schemas";
