import type { TopicStatus } from "@/types";

/** Haritada bir hücre: ünite düzeyi konu + öğrencinin (tembel) ilerlemesi. */
export type TopicMapCell = {
  topicId: string;
  name: string;
  status: TopicStatus;
  confidence: number | null;
  completedAt: string | null;
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

export type TemplateOption = { id: string; name: string; isSystem: boolean };
