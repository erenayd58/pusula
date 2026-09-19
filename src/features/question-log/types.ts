import type { QuickLogEdit } from "@/components/shared/quick-log-context";

/** Hızlı kayıt seçenekleri: şablonun dersleri, ünite düzeyi konuları ve net kuralı. */
export type QuickLogSubject = {
  subjectId: string;
  code: string;
  name: string;
  shortName: string;
  color: string;
  topics: { topicId: string; name: string }[];
};

export type QuickLogOptions = {
  subjects: QuickLogSubject[];
  /** Şablon `scoring.wrong_penalty`; 0 = ceza yok. */
  wrongPenalty: number;
};

/** Listelerde bir kayıt satırı (ders/konu adları birleşik). */
export type QuestionLogRow = {
  id: string;
  logDate: string;
  subjectId: string;
  subjectName: string;
  subjectShortName: string;
  subjectColor: string;
  topicId: string | null;
  topicName: string | null;
  /** Faz 7: bağlı kaynak testi. */
  sectionId: string | null;
  sectionLabel: string | null;
  total: number;
  correct: number;
  wrong: number;
  blank: number;
  durationMinutes: number | null;
};

/** Düzenleme için sheet'e verilen başlangıç değerleri (tanım paylaşılan context'te). */
export type QuickLogInitial = QuickLogEdit;

export type SubjectWeekBar = {
  subjectId: string;
  name: string;
  shortName: string;
  color: string;
  questions: number;
  correct: number;
};

export type DailyPoint = { day: string; questions: number };
