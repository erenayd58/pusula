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
export { priorityScore, SCORE_WEIGHTS, PROXIMITY_SWING } from "./lib/priority";
export {
  buildSuggestions,
  alertToTask,
  dismissalKey,
  plannedKey,
  strategyNoteFor,
  type Suggestion,
  type SuggestionTask,
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
  StudentStrategy,
} from "./types";
export { AttentionList } from "./components/attention-list";
export { WeakTopics } from "./components/weak-topics";
export { SuggestionList } from "./components/suggestion-list";
export { SetupList } from "./components/setup-list";
export {
  getTopicAlertFacts,
  getTopicAlerts,
  getSuggestions,
  getStrategyContext,
  getSetupFacts,
  getSetupAlerts,
} from "./server/queries";
export { dismissSuggestion } from "./server/actions";
export { dismissSuggestionSchema, type DismissSuggestionInput } from "./schemas";
