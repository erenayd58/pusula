import { analyticsWidgets } from "@/features/analytics";
import { goalsWidgets } from "@/features/goals";
import { plannerWidgets } from "@/features/planner";
import { questionLogWidgets } from "@/features/question-log";
import { topicsWidgets } from "@/features/topics";
import type { ModuleWidgets, StudentTodayWidget } from "@/modules/define-module";

/**
 * Tüm modül panel kartları (02-mimari Bölüm 3.2/3.3). Panel sayfaları yalnızca bu dosyayı
 * import eder; açık modüllere göre filtreler ve `order`'a göre sıralar.
 */
export const widgets: readonly ModuleWidgets[] = [
  analyticsWidgets,
  goalsWidgets,
  plannerWidgets,
  questionLogWidgets,
  topicsWidgets,
];

export type ResolvedTodayWidget = StudentTodayWidget & {
  moduleId: string;
  /** moduleId + sıra: bir modülün birden fazla kartı için React anahtarı. */
  key: string;
  column: "main" | "side";
};

export function getStudentTodayWidgets(enabled: ReadonlySet<string>): ResolvedTodayWidget[] {
  return widgets
    .filter((w) => enabled.has(w.moduleId))
    .flatMap((w) =>
      (w.studentToday ?? []).map((s, i) => ({
        ...s,
        moduleId: w.moduleId,
        key: `${w.moduleId}-${i}`,
        column: s.column ?? "main",
      })),
    )
    .sort((a, b) => a.order - b.order);
}
