/**
 * `goals` modülü dışa açık API'si. İstemci bileşenleri bu dosyayı import etmez
 * (sunucu dosyaları da dışa açılır).
 */
export { goalsModule } from "./module";
export { goalsWidgets } from "./widgets";
export { GoalForm } from "./components/goal-form";
export {
  getActiveGoals,
  getGoalProgress,
  type ActiveGoals,
  type GoalProgress,
} from "./server/queries";
export { setGoals } from "./server/actions";
export { setGoalsSchema, goalPeriodValues, type SetGoalsInput } from "./schemas";
// Faz 5b: hedef ve geri planlama (09 §2 Parça 2)
export { TargetForm } from "./components/target-form";
export { TopicTargetList } from "./components/topic-target-list";
export { WeeklyGoalSuggestion } from "./components/weekly-goal-suggestion";
export { SubjectPaceTable } from "./components/subject-pace-table";
export { PaceTile } from "./components/pace-tile";
export { getStudentTargets, getWeeklyAvailableMinutes } from "./server/queries";
export { setStudentTargets, updateTopicTarget, applyWeeklyGoalSuggestion } from "./server/actions";
export {
  setStudentTargetsSchema,
  updateTopicTargetSchema,
  weeklyGoalFromTargetSchema,
  type SetStudentTargetsInput,
  type UpdateTopicTargetInput,
  type WeeklyGoalFromTargetInput,
} from "./schemas";
export type { StudentTargets, SubjectTargetRow, TopicTargetRow, FeasibilityBase } from "./types";
