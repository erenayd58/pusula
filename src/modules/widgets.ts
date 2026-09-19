import { analyticsWidgets } from "@/features/analytics";
import { goalsWidgets } from "@/features/goals";
import { mockExamsWidgets } from "@/features/mock-exams";
import { plannerWidgets } from "@/features/planner";
import { questionLogWidgets } from "@/features/question-log";
import { topicsWidgets } from "@/features/topics";
import type {
  ModuleWidgets,
  ParentSummaryWidget,
  StudentTodayWidget,
} from "@/modules/define-module";

/**
 * Tüm modül panel kartları (02-mimari Bölüm 3.2/3.3). Panel sayfaları yalnızca bu dosyayı
 * import eder; açık modüllere göre filtreler ve `order`'a göre sıralar.
 */
export const widgets: readonly ModuleWidgets[] = [
  analyticsWidgets,
  goalsWidgets,
  mockExamsWidgets,
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

export type ResolvedParentWidget = ParentSummaryWidget & { moduleId: string; key: string };

/** Veli Özet kartları: çocuğun açık modüllerine göre, `order` sırasıyla (Faz 6b, C15). */
export function getParentSummaryWidgets(enabled: ReadonlySet<string>): ResolvedParentWidget[] {
  return widgets
    .filter((w) => enabled.has(w.moduleId))
    .flatMap((w) =>
      (w.parentSummary ?? []).map((s, i) => ({
        ...s,
        moduleId: w.moduleId,
        key: `${w.moduleId}-${i}`,
      })),
    )
    .sort((a, b) => a.order - b.order);
}

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
