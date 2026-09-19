"use client";

import { createContext, useContext } from "react";

/**
 * Hızlı kayıt sheet'ini açan context (Faz 4b, 08 §2 Parça 2). Tanım burada (shared) durur ki
 * planner gibi başka modüllerin istemci bileşenleri `@/features/question-log` index'ini
 * (sunucu kodu taşır) import etmeden `useQuickLog()` diyebilsin. Provider ve sheet
 * question-log modülündedir.
 */

/** Düzenleme modu: mevcut kaydın değerleri. */
export type QuickLogEdit = {
  id: string;
  logDate: string;
  subjectId: string;
  topicId: string | null;
  correct: number;
  wrong: number;
  blank: number;
  durationMinutes: number | null;
};

/** Plan görevinden açılış: ders/konu/hedef ön dolu, kayıt görevi tamamlar (plan_item_id). */
export type QuickLogPlanItem = {
  id: string;
  title: string;
  subjectId: string | null;
  topicId: string | null;
  targetValue: number | null;
};

/**
 * Kaynak testinden açılış (Faz 7): ders/konu ön dolu, `questionCount` varsa Boş otomatik; kayıt
 * `section_id` taşır. Testin yayınlanmış planda açık görevi varsa `planItem` da verilir (tek RPC).
 */
export type QuickLogSection = {
  id: string;
  title: string;
  resourceTitle: string;
  subjectId: string | null;
  topicId: string | null;
  questionCount: number | null;
};

export type QuickLogRequest = {
  edit?: QuickLogEdit;
  planItem?: QuickLogPlanItem;
  section?: QuickLogSection;
};

export type QuickLogContextValue = {
  /** Sheet'i açar; `edit` düzenleme modu, `planItem` plan görevi, `section` kaynak testi ön dolgusu. */
  open: (request?: QuickLogRequest) => void;
};

export const QuickLogContext = createContext<QuickLogContextValue | null>(null);

export function useQuickLog(): QuickLogContextValue {
  const ctx = useContext(QuickLogContext);
  if (!ctx) throw new Error("useQuickLog yalnızca QuickLogProvider içinde kullanılır.");
  return ctx;
}
