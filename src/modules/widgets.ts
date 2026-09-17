import { topicsWidgets } from "@/features/topics";
import type { ModuleWidgets } from "@/modules/define-module";

/**
 * Tüm modül panel kartları (02-mimari Bölüm 3.2/3.3). Panel sayfaları yalnızca bu dosyayı
 * import eder; açık modüllere göre filtreler ve `order`'a göre sıralar.
 */
export const widgets: readonly ModuleWidgets[] = [topicsWidgets];

export function getStudentTodayWidgets(enabled: ReadonlySet<string>) {
  return widgets
    .filter((w) => w.studentToday && enabled.has(w.moduleId))
    .map((w) => ({ moduleId: w.moduleId, ...w.studentToday! }))
    .sort((a, b) => a.order - b.order);
}
