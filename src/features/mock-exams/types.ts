import type { MockPoint } from "@/lib/exam/mock";

/** Şablon dersi (sihirbaz satırı, tablolar, rozetler). */
export type MockSubject = {
  subjectId: string;
  name: string;
  shortName: string;
  color: string;
  sortOrder: number;
  /** Sınavdaki soru sayısı; boşsa Boş elle girilir (karar C4). */
  questionCount: number | null;
  topics: { topicId: string; name: string }[];
};

/** Katalog formunun şablon seçeneği (ad + dersler). */
export type CatalogTemplate = {
  id: string;
  name: string;
  isSystem: boolean;
  subjects: { subjectId: string; name: string; shortName: string }[];
};

/** Katalog denemesi (kurum düzeyi). */
export type MockExam = {
  id: string;
  templateId: string;
  title: string;
  publisher: string | null;
  examDate: string | null;
  /** null = genel; dolu = branş. */
  subjectId: string | null;
  subjectShortName: string | null;
  /** Bu denemeyi giren öğrenci sayısı (katalog tablosu). */
  resultCount: number;
};

/** Sihirbaz seçenekleri: dersler + net kuralı + öğrencinin şablonundaki katalog. */
export type MockOptions = {
  subjects: MockSubject[];
  wrongPenalty: number;
  /** Tarih sırasıyla; `enteredResultId` dolu ise öğrenci girmiş ("Girildi" rozeti). */
  exams: (Pick<
    MockExam,
    "id" | "title" | "publisher" | "examDate" | "subjectId" | "subjectShortName"
  > & {
    enteredResultId: string | null;
  })[];
  today: string;
};

/** Liste satırı / son deneme kartı. */
export type MockResultSummary = {
  id: string;
  title: string;
  takenOn: string;
  isBranch: boolean;
  /** Branş denemesinde ders (rozet). */
  branchSubject: { subjectId: string; shortName: string; color: string } | null;
  totalNet: number;
  /** Önceki genel denemeye göre; ilk ve branş null. */
  delta: number | null;
  mockExamId: string | null;
};

/** Detaydaki ders satırı. */
export type SubjectNetRow = {
  subjectId: string;
  name: string;
  shortName: string;
  color: string;
  correct: number;
  wrong: number;
  blank: number;
  net: number;
  questionCount: number | null;
  /** Aynı dersin önceki genel denemedeki netine göre; yoksa null. */
  delta: number | null;
};

export type MockResultDetail = MockResultSummary & {
  studentId: string;
  customTitle: string | null;
  /** Katalog dışı branş dersi. */
  subjectId: string | null;
  durationMinutes: number | null;
  score: number | null;
  percentile: number | null;
  note: string | null;
  subjects: SubjectNetRow[];
  topics: { topicId: string; name: string; subjectId: string }[];
};

/** Trend verisi: genel denemeler tarih sırasıyla + ders bilgisi (grafik serileri). */
export type TrendData = {
  points: MockPoint[];
  subjects: MockSubject[];
};

export type TopicMarkRow = {
  topicId: string;
  name: string;
  subjectId: string;
  subjectShortName: string;
  subjectColor: string;
  /** Son N denemenin kaçında işaretli. */
  count: number;
  /** Penceredeki genel deneme sayısı (N ile sınırlı). */
  exams: number;
};

/** Ders bazlı net gelişimi (K2): son / önceki / son N ortalaması / değişim. */
export type SubjectProgressRow = {
  subjectId: string;
  name: string;
  shortName: string;
  color: string;
  last: number | null;
  prev: number | null;
  avg: number | null;
  delta: number | null;
  exams: number;
};

/** Karşılaştırma tablosu satırı (yalnızca koç). */
export type ComparisonRow = {
  studentId: string;
  fullName: string;
  totalNet: number;
  nets: Record<string, number>;
};

export type ExamComparison = {
  exam: MockExam;
  subjects: Pick<MockSubject, "subjectId" | "name" | "shortName" | "color">[];
  rows: ComparisonRow[];
  average: { totalNet: number; nets: Record<string, number> } | null;
};
