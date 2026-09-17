import type { LucideIcon } from "lucide-react";
import type { ModuleManifest, NavItem, SegmentItem } from "@/modules/define-module";

/**
 * Registry üzerinde çalışan saf yardımcılar. Manifest listesi parametre olarak gelir;
 * böylece birim testleri sahte manifestlerle çalışır, `registry.ts` bunları bağlar.
 */

export type ResolvedNavItem = {
  moduleId: string;
  href: string;
  label: string;
  icon: LucideIcon;
};

export type ResolvedTab = {
  moduleId: string;
  segment: string;
  label: string;
};

type EnabledSet = ReadonlySet<string>;

function byOrder<T extends { order: number }>(a: T, b: T) {
  return a.order - b.order;
}

function isEnabled(m: ModuleManifest, enabled: EnabledSet) {
  return m.core === true || enabled.has(m.id);
}

function resolveNav(m: ModuleManifest, item: NavItem): ResolvedNavItem & { order: number } {
  return {
    moduleId: m.id,
    href: item.href,
    label: item.label ?? m.name,
    icon: item.icon ?? m.icon,
    order: item.order,
  };
}

/** Öğrenci menüsü; `mobile: true` ile yalnızca alt menüde görünenler. */
export function getStudentNav(
  modules: readonly ModuleManifest[],
  enabled: EnabledSet,
  opts: { mobile?: boolean } = {},
): ResolvedNavItem[] {
  return modules
    .filter((m) => isEnabled(m, enabled))
    .flatMap((m) => (m.nav?.student ?? []).map((item) => ({ item, resolved: resolveNav(m, item) })))
    .filter(({ item }) => !opts.mobile || item.mobile === true)
    .map(({ resolved }) => resolved)
    .sort(byOrder);
}

/** Koç menüsü öğrenciye bağlı değildir; tüm kayıtlı modüller görünür. */
export function getCoachNav(modules: readonly ModuleManifest[]): ResolvedNavItem[] {
  return modules
    .flatMap((m) => (m.nav?.coach ?? []).map((item) => resolveNav(m, item)))
    .sort(byOrder);
}

function resolveSegments(
  modules: readonly ModuleManifest[],
  enabled: EnabledSet,
  pick: (m: ModuleManifest) => SegmentItem[] | undefined,
): ResolvedTab[] {
  return modules
    .filter((m) => isEnabled(m, enabled))
    .flatMap((m) =>
      (pick(m) ?? []).map((t) => ({
        moduleId: m.id,
        segment: t.segment,
        label: t.label,
        order: t.order,
      })),
    )
    .sort(byOrder)
    .map(({ moduleId, segment, label }) => ({ moduleId, segment, label }));
}

export function getCoachStudentTabs(
  modules: readonly ModuleManifest[],
  enabled: EnabledSet,
): ResolvedTab[] {
  return resolveSegments(modules, enabled, (m) => m.coachStudentTabs);
}

export function getParentNav(
  modules: readonly ModuleManifest[],
  enabled: EnabledSet,
): ResolvedTab[] {
  return resolveSegments(modules, enabled, (m) => m.nav?.parent);
}

/** Verilen href'i menüsünde taşıyan modül (öğrenci/koç yer tutucu sayfaları için). */
export function findModuleByHref(
  modules: readonly ModuleManifest[],
  role: "student" | "coach",
  href: string,
): ModuleManifest | undefined {
  return modules.find((m) => (m.nav?.[role] ?? []).some((item) => item.href === href));
}

/** Verilen sekme/segmenti taşıyan modül (koç öğrenci sekmesi veya veli menüsü). */
export function findModuleBySegment(
  modules: readonly ModuleManifest[],
  kind: "coachStudentTab" | "parent",
  segment: string,
): ModuleManifest | undefined {
  return modules.find((m) =>
    (kind === "coachStudentTab" ? m.coachStudentTabs : m.nav?.parent)?.some(
      (t) => t.segment === segment,
    ),
  );
}

/**
 * Veritabanı satırlarını manifestlerle birleştirir: satır varsa `enabled`, yoksa
 * `defaultEnabled`; `core` modüller her zaman açık. Bilinmeyen module_id satırları yok sayılır.
 */
export function mergeEnabled(
  modules: readonly ModuleManifest[],
  rows: readonly { module_id: string; enabled: boolean }[],
): Set<string> {
  const byId = new Map(rows.map((r) => [r.module_id, r.enabled]));
  const enabled = new Set<string>();
  for (const m of modules) {
    if (m.core || (byId.get(m.id) ?? m.defaultEnabled)) enabled.add(m.id);
  }
  return enabled;
}

export type ModuleChange = { moduleId: string; enabled: boolean };

/**
 * Bir modülü aç/kapat isteğini bağımlılıklarla birlikte çözer (02 Bölüm 3.3):
 * açarken kapalı `dependsOn` modülleri de açılır; kapatırken bu modüle bağımlı açık
 * modüller de kapanır. `core` modüller kapatılamaz. Sonuç, uygulanacak değişiklik listesidir
 * (istenen modül ilk sırada); zaten istenen durumdaysa boş.
 */
export function resolveToggle(
  modules: readonly ModuleManifest[],
  enabled: EnabledSet,
  moduleId: string,
  next: boolean,
): ModuleChange[] {
  const byId = new Map(modules.map((m) => [m.id, m]));
  const target = byId.get(moduleId);
  if (!target || target.core) return [];
  if (isEnabled(target, enabled) === next) return [];

  const changes: ModuleChange[] = [{ moduleId, enabled: next }];
  const seen = new Set([moduleId]);

  if (next) {
    const queue = [...(target.dependsOn ?? [])];
    while (queue.length > 0) {
      const id = queue.shift()!;
      const dep = byId.get(id);
      if (!dep || seen.has(id)) continue;
      seen.add(id);
      if (!isEnabled(dep, enabled)) {
        changes.push({ moduleId: id, enabled: true });
        queue.push(...(dep.dependsOn ?? []));
      }
    }
  } else {
    const queue = [moduleId];
    while (queue.length > 0) {
      const id = queue.shift()!;
      for (const m of modules) {
        if (seen.has(m.id) || m.core || !isEnabled(m, enabled)) continue;
        if ((m.dependsOn ?? []).includes(id)) {
          seen.add(m.id);
          changes.push({ moduleId: m.id, enabled: false });
          queue.push(m.id);
        }
      }
    }
  }
  return changes;
}
