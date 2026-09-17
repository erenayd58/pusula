import { announcementsModule } from "@/features/announcements";
import { coachNotesModule } from "@/features/coach-notes";
import { coreModule } from "@/features/core";
import { goalsModule } from "@/features/goals";
import { mistakesModule } from "@/features/mistakes";
import { mockExamsModule } from "@/features/mock-exams";
import { plannerModule } from "@/features/planner";
import { questionLogModule } from "@/features/question-log";
import { resourcesModule } from "@/features/resources";
import { topicsModule } from "@/features/topics";
import { videosModule } from "@/features/videos";
import type { ModuleManifest } from "@/modules/define-module";
import * as helpers from "@/modules/lib/registry-helpers";

/**
 * Tüm modül manifestleri (sadece metadata). Menü, sekme ve rota koruması buradan üretilir;
 * elle menü yazılmaz (02-mimari Bölüm 3.3). Features'a bakan tek shared katman budur.
 * Yalnızca sunucu tarafında import edilir; istemci bileşenleri menü öğelerini prop olarak alır.
 */
export const modules: readonly ModuleManifest[] = [
  coreModule,
  topicsModule,
  questionLogModule,
  goalsModule,
  plannerModule,
  mockExamsModule,
  mistakesModule,
  resourcesModule,
  videosModule,
  coachNotesModule,
  announcementsModule,
];

export type { ModuleChange, ResolvedNavItem, ResolvedTab } from "@/modules/lib/registry-helpers";

export const getModule = (id: string) => modules.find((m) => m.id === id);
export const getStudentNav = (enabled: ReadonlySet<string>, opts?: { mobile?: boolean }) =>
  helpers.getStudentNav(modules, enabled, opts);
export const getCoachNav = () => helpers.getCoachNav(modules);
export const getCoachStudentTabs = (enabled: ReadonlySet<string>) =>
  helpers.getCoachStudentTabs(modules, enabled);
export const getParentNav = (enabled: ReadonlySet<string>) =>
  helpers.getParentNav(modules, enabled);
export const findModuleByHref = (role: "student" | "coach", href: string) =>
  helpers.findModuleByHref(modules, role, href);
export const findModuleBySegment = (kind: "coachStudentTab" | "parent", segment: string) =>
  helpers.findModuleBySegment(modules, kind, segment);
export const resolveToggle = (enabled: ReadonlySet<string>, moduleId: string, next: boolean) =>
  helpers.resolveToggle(modules, enabled, moduleId, next);
