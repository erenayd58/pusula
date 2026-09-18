import type { TopicStatus } from "@/types";

/** Haritada bir hücre: ünite düzeyi konu + öğrencinin (tembel) ilerlemesi. */
export type TopicMapCell = {
  topicId: string;
  name: string;
  status: TopicStatus;
  confidence: number | null;
  completedAt: string | null;
  /** Bu konuya girilen toplam soru (v_topic_question_stats); yoksa 0. */
  questions: number;
  /** Başarı yüzdesi (0-100); soru yoksa null. */
  accuracy: number | null;
  /** Okulda tahmini bitiş (`topics.school_finish_on`, YYYY-AA-GG); takvim doldurulmadıysa null. */
  schoolFinishOn: string | null;
  /** Koçun hedef tarihi (`student_topic_targets.target_on`); hedef kurulmadıysa null (Faz 5b). */
  targetOn: string | null;
};

export type TopicMapSubject = {
  subjectId: string;
  code: string;
  name: string;
  shortName: string;
  color: string;
  topics: TopicMapCell[];
};

export type TopicMap = {
  templateId: string;
  templateName: string;
  subjects: TopicMapSubject[];
};

/** Şablon editörü: dersler ve iç içe konular. */
export type TemplateTopic = {
  id: string;
  name: string;
  sortOrder: number;
  /** İlerleme satırı olan öğrenci sayısı (RLS'nin gösterdiği kadar); silme onayında yazılır. */
  progressStudents: number;
  /** Okulda tahmini bitiş (YYYY-AA-GG); ünite düzeyinde dolu, alt konular üstünden okur. */
  schoolFinishOn: string | null;
  children: TemplateTopic[];
};

export type TemplateSubject = {
  subjectId: string;
  code: string;
  name: string;
  shortName: string;
  color: string;
  topics: TemplateTopic[];
};

export type TemplateEditor = {
  templateId: string;
  name: string;
  subjects: TemplateSubject[];
};

/** `examDate`: şablonun sınav tarihi (YYYY-AA-GG); yeni öğrenci formunun varsayılanı. */
export type TemplateOption = {
  id: string;
  name: string;
  isSystem: boolean;
  examDate: string | null;
};
