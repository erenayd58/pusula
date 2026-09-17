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
  total: number;
  correct: number;
  wrong: number;
  blank: number;
  durationMinutes: number | null;
};

/** Düzenleme için sheet'e verilen başlangıç değerleri. */
export type QuickLogInitial = {
  id: string;
  logDate: string;
  subjectId: string;
  topicId: string | null;
  correct: number;
  wrong: number;
  blank: number;
  durationMinutes: number | null;
};

export type SubjectWeekBar = {
  subjectId: string;
  name: string;
  shortName: string;
  color: string;
  questions: number;
  correct: number;
};

export type DailyPoint = { day: string; questions: number };
