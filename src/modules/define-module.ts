import type { LucideIcon } from "lucide-react";
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
