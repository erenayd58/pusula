import type { TopicStatus } from "@/types";

/** Ders satırı: şablonun dersi + (varsa) soru hedefi ve gerçekleşen (`v_student_subject_targets`). */
export type SubjectTargetRow = {
  subjectId: string;
  name: string;
  shortName: string;
  color: string;
  sortOrder: number;
  examQuestionCount: number | null;
  /** `student_subject_targets.questions`; hedef yoksa null. */
  questions: number | null;
  /** `target_starts_on`'dan itibaren çözülen soru. */
  questionsDone: number;
  topicsTotal: number;
  topicsDone: number;
  /** Hedefi bugün ya da öncesi olan konu (takvime göre bugüne kadar beklenen). */
  topicsExpected: number;
};

/** Konu satırı (`v_student_pace_facts`): durum, hedef ve okul tarihi. */
export type TopicTargetRow = {
  topicId: string;
  subjectId: string;
  name: string;
  sortOrder: number;
  subjectSortOrder: number;
  status: TopicStatus;
  done: boolean;
  completedAt: string | null;
  targetOn: string | null;
  schoolFinishOn: string | null;
};

/** "Hedef" sekmesinin verisi (`getStudentTargets`). */
export type StudentTargets = {
  studentId: string;
  examDate: string | null;
  /** `students.topics_finish_by`; hedef kurulmadıysa null. */
  topicsFinishBy: string | null;
  targetStartsOn: string | null;
  subjects: SubjectTargetRow[];
  topics: TopicTargetRow[];
  /** Σ bitmemiş konu (`estimated_minutes ?? strategy.topic_minutes_default`). */
  remainingTopicMinutes: number;
};

export type { FeasibilityInput } from "@/lib/strategy/feasibility";

/** Gerçekçilik cümlesinin formda canlı hesaplanması için sabit girdiler. */
export type FeasibilityBase = {
  minutesPerQuestion: number;
  weeksToExam: number;
  weeklyAvailableMinutes: number;
  remainingTopicMinutes: number;
  /** Σ gerçekleşen soru (başlangıçtan itibaren); kalan = hedef − bu. */
  questionsDone: number;
};
