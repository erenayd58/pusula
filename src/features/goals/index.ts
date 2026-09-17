/**
 * `goals` modülü dışa açık API'si. İstemci bileşenleri bu dosyayı import etmez
 * (sunucu dosyaları da dışa açılır).
 */
export { goalsModule } from "./module";
export { goalsWidgets } from "./widgets";
export { GoalForm } from "./components/goal-form";
export { getActiveGoals, getGoalProgress, type ActiveGoals, type GoalProgress } from "./server/queries";
export { setGoals } from "./server/actions";
export { setGoalsSchema, goalPeriodValues, type SetGoalsInput } from "./schemas";
