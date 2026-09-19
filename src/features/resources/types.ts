import type { ResourceType } from "@/types";

export type { ResourceType };

/** Form seçenekleri: şablonun dersleri ve ünite düzeyi konuları (konuya eşleme, ders çipleri). */
export type ResourceSubjectOption = {
  subjectId: string;
  name: string;
  shortName: string;
  color: string;
  topics: { topicId: string; name: string }[];
};

export type ResourceOptions = {
  templateId: string;
  subjects: ResourceSubjectOption[];
};

/** Katalog satırı (koç tablosu ve "Öğrenci ekledi" bölümü). */
export type CatalogRow = {
  id: string;
  title: string;
  publisher: string | null;
  publishYear: number | null;
  type: ResourceType;
  templateId: string;
  subjectId: string | null;
  subjectShortName: string | null;
  subjectColor: string | null;
  /** Dolu = öğrencinin özel kaynağı (karar D1). */
  studentId: string | null;
  studentName: string | null;
  sectionCount: number;
  assignedCount: number;
};

/** Benzer ad önerisi için kısa katalog satırı. */
export type CatalogTitle = {
  id: string;
  title: string;
  publisher: string | null;
  subjectShortName: string | null;
  /** Öğrenci için: zaten atanmış mı. */
  assigned: boolean;
};

export type ResourceSection = {
  id: string;
  resourceId: string;
  title: string;
  subjectId: string | null;
  topicId: string | null;
  topicName: string | null;
  questionCount: number | null;
  pageStart: number | null;
  pageEnd: number | null;
  sortOrder: number;
};

export type ResourceDetail = {
  id: string;
  title: string;
  publisher: string | null;
  publishYear: number | null;
  type: ResourceType;
  templateId: string;
  subjectId: string | null;
  subjectName: string | null;
  subjectShortName: string | null;
  subjectColor: string | null;
  studentId: string | null;
  studentName: string | null;
  sections: ResourceSection[];
  assigned: { studentId: string; fullName: string }[];
};

/** Öğrencinin atanmış kaynağı + ilerleme (`v_student_resource_progress`). */
export type StudentResourceRow = {
  resourceId: string;
  title: string;
  publisher: string | null;
  type: ResourceType;
  subjectId: string | null;
  subjectShortName: string | null;
  subjectColor: string | null;
  /** Öğrencinin kendi eklediği özel kaynak. */
  isOwn: boolean;
  sectionsTotal: number;
  sectionsDone: number;
  questionsTotal: number;
  questionsDone: number;
  percent: number | null;
  lastLogDate: string | null;
};

/** Kitap detayında bir test satırı (`v_student_resource_sections`). */
export type SectionRow = {
  resourceId: string;
  sectionId: string;
  title: string;
  subjectId: string | null;
  subjectName: string | null;
  subjectShortName: string | null;
  subjectColor: string | null;
  topicId: string | null;
  topicName: string | null;
  questionCount: number | null;
  pageStart: number | null;
  pageEnd: number | null;
  sortOrder: number;
  doneAt: string | null;
  logsCount: number;
  openPlanItemId: string | null;
};

export type StudentResourceDetail = {
  resource: StudentResourceRow;
  sections: SectionRow[];
};
