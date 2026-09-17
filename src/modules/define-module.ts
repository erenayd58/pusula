import type { LucideIcon } from "lucide-react";
import type { ComponentType } from "react";
import type { z } from "zod";
import type { Role } from "@/types";

/**
 * Modül manifesti (02-mimari Bölüm 3.2). SADECE metadata: React bileşeni import etmez.
 * Panel kartları (`widgets.ts`) ayrı tutulur; `defineWidgets` Faz 3'te ilk kartla gelir.
 *
 * Bir modül aynı rol için birden fazla menü öğesi verebilir (çekirdek: Bugün + Ben), bu
 * yüzden `nav` alanları dizidir. Veli menüsü seçili çocuğa bağlı olduğu için href yerine
 * segment taşır (`/parent/<studentId>/<segment>`); koç öğrenci sekmeleri de öyle.
 */
export type { Role };

export type NavItem = {
  href: string;
  /** Boşsa modül adı kullanılır. */
  label?: string;
  /** Boşsa modül ikonu kullanılır. */
  icon?: LucideIcon;
  order: number;
  /** Öğrenci: telefon/tablet alt menüsünde de görünür (04 Bölüm 8.2). */
  mobile?: boolean;
};

export type SegmentItem = {
  /** Boş dize kök sayfa (Genel bakış / Özet). */
  segment: string;
  label: string;
  icon?: LucideIcon;
  order: number;
};

export type ModuleManifest<TSettings extends z.ZodType = z.ZodType> = {
  /** Veritabanındaki `student_modules.module_id` ile aynı. */
  id: string;
  name: string;
  description: string;
  icon: LucideIcon;
  /** true ise kapatılamaz ve her zaman açık sayılır. */
  core?: boolean;
  defaultEnabled: boolean;
  dependsOn?: string[];
  nav?: {
    student?: NavItem[];
    coach?: NavItem[];
    parent?: SegmentItem[];
  };
  coachStudentTabs?: SegmentItem[];
  /** Öğrenci bazlı ayarlar (ör. varsayılan günlük hedef). */
  settingsSchema?: TSettings;
};

export function defineModule<T extends z.ZodType>(m: ModuleManifest<T>): ModuleManifest<T> {
  return m;
}

/** Panel kartı bileşenine geçen bağlam: kartın çizildiği öğrenci. */
export type ModuleWidgetProps = { studentId: string };

/**
 * Bugün ekranı kartı: masaüstünde iki sütun (04 §8.2): `main` = "bugün ne yapacağım"
 * (hedef, kayıtlar, plan), `side` = "neyi kaçırıyorum" (haftalık özet, konular, tekrar).
 * Telefonda tek sütun, `order` sırasıyla.
 */
export type StudentTodayWidget = {
  component: ComponentType<ModuleWidgetProps>;
  order: number;
  column?: "main" | "side";
};

/**
 * Panel kartları manifestten AYRI (02 karar #13): bileşen import eder, `src/modules/widgets.ts`
 * toplar. Şimdilik yalnızca `studentToday` (bir modül birden fazla kart verebilir); koç/veli
 * kartları ilk ihtiyaçla eklenir.
 */
export type ModuleWidgets = {
  /** manifest.id ile aynı. */
  moduleId: string;
  studentToday?: StudentTodayWidget[];
};

export function defineWidgets(w: ModuleWidgets): ModuleWidgets {
  return w;
}
