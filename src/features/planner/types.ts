import type { PlanItemKind, PlanStatus } from "@/types";

export type TargetUnit = "questions" | "minutes";

/** Ekranda bir plan görevi (ders/konu adları birleşik). */
export type PlanItem = {
  id: string;
  planId: string;
  /** null = "bu hafta içinde". */
  dayOfWeek: number | null;
  sortOrder: number;
  kind: PlanItemKind;
  title: string;
  subjectId: string | null;
  subjectName: string | null;
  subjectShortName: string | null;
  subjectColor: string | null;
  topicId: string | null;
  topicName: string | null;
  url: string | null;
  targetValue: number | null;
  targetUnit: TargetUnit | null;
  estimatedMinutes: number;
  completedAt: string | null;
  studentNote: string | null;
  postponedFrom: number | null;
  postponedAt: string | null;
};

export type WeekPlan = {
  id: string;
  studentId: string;
  /** YYYY-MM-DD, pazartesi. */
  weekStart: string;
  status: PlanStatus;
  coachMessage: string | null;
  studentReflection: string | null;
  publishedAt: string | null;
  updatedAt: string;
  items: PlanItem[];
};

/** Görev formu seçenekleri: öğrencinin şablonundaki dersler ve ünite düzeyi konular. */
export type PlanSubjectOption = {
  subjectId: string;
  name: string;
  shortName: string;
  color: string;
  topics: { topicId: string; name: string }[];
};

/** Ders bazlı tempo (v_student_subject_pace). */
export type SubjectPace = { subjectId: string; minutesPerQuestion: number };

export type TaskPoolCategoryId = "suggestions" | "weak" | "not_started" | "review_due" | "frequent";
// Faz 5: "resources" | "videos"

export type TaskPoolItem = {
  key: string;
  categoryId: TaskPoolCategoryId;
  kind: PlanItemKind;
  title: string;
  subjectId: string | null;
  topicId: string | null;
  targetValue: number | null;
  targetUnit: TargetUnit | null;
  estimatedMinutes: number;
  reason?: string;
  url?: string;
};

export type TaskPoolCategory = {
  id: TaskPoolCategoryId;
  title: string;
  items: TaskPoolItem[];
  emptyText: string;
};

/** v_plan_completion satırı. */
export type PlanCompletion = {
  planId: string;
  weekStart: string;
  status: PlanStatus;
  itemsTotal: number;
  itemsCompleted: number;
  postponedCount: number;
  percent: number | null;
};

/** Koç "Planlar" listesi satırı. */
export type CoachPlanRow = {
  studentId: string;
  fullName: string;
  status: PlanStatus | null;
  itemsTotal: number;
  itemsCompleted: number;
  percent: number | null;
};
