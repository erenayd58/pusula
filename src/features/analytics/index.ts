/**
 * `analytics` modülü dışa açık API'si. İstemci bileşenleri bu dosyayı import etmez (sunucu
 * dosyaları da dışa açılır); sayfalar ve diğer modüllerin sunucu kodu buradan alır.
 * Bağımlılık yönü (08 §0): planner → analytics; analytics → planner / schedule YOK.
 */
export { analyticsModule } from "./module";
export { evaluateTopicAlerts, groupAlerts, alertReason, type AlertThresholds } from "./lib/alerts";
export { pickStudentNudge, nudgeText } from "./lib/nudge";
export type { TopicAlertFacts, TopicAlert, AlertGroup, AlertSubject } from "./types";
export { AttentionList } from "./components/attention-list";
export { WeakTopics } from "./components/weak-topics";
export { getTopicAlertFacts, getTopicAlerts } from "./server/queries";
