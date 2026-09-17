import "server-only";

import { createClient } from "@/lib/supabase/server";
import { countDone } from "../lib/completion";
import type {
  TemplateEditor,
  TemplateOption,
  TemplateSubject,
  TemplateTopic,
  TopicMap,
  TopicMapSubject,
} from "../types";

/**
 * Konular modülü okuma sorguları. Kullanıcının oturumuyla çalışır; RLS öğrencinin yalnızca
 * kendi ilerlemesini, koçun kendi öğrencilerininkini görmesini sağlar (03 §5.3).
 */

type TopicRow = { id: string; name: string; sort_order: number; parent_id: string | null };

const SUBJECT_SELECT =
  "id, code, name, short_name, color, sort_order, topics(id, name, sort_order, parent_id)";

async function listSubjectsWithTopics(templateId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("subjects")
    .select(SUBJECT_SELECT)
    .eq("template_id", templateId)
    .order("sort_order")
    .order("sort_order", { referencedTable: "topics" });
  if (error) throw error;
  return data;
}

/**
 * Öğrencinin konu haritası: şablonun ünite düzeyi konuları (parent_id boş; 02 karar #29) ve
 * tembel ilerleme (satır yoksa `not_started`). Şablon atanmamışsa null.
 */
export async function getTopicMap(studentId: string): Promise<TopicMap | null> {
  const supabase = await createClient();
  const { data: student, error } = await supabase
    .from("students")
    .select("curriculum_template_id, template:curriculum_templates(name)")
    .eq("profile_id", studentId)
    .maybeSingle();
  if (error) throw error;
  if (!student?.curriculum_template_id || !student.template) return null;

  const [subjects, progress] = await Promise.all([
    listSubjectsWithTopics(student.curriculum_template_id),
    supabase
      .from("student_topic_progress")
      .select("topic_id, status, confidence, completed_at")
      .eq("student_id", studentId)
      .then(({ data, error }) => {
        if (error) throw error;
        return data;
      }),
  ]);
  const byTopic = new Map(progress.map((p) => [p.topic_id, p]));

  const mapped: TopicMapSubject[] = subjects.map((s) => ({
    subjectId: s.id,
    code: s.code,
    name: s.name,
    shortName: s.short_name,
    color: s.color,
    topics: s.topics
      .filter((t) => t.parent_id === null)
      .map((t) => {
        const p = byTopic.get(t.id);
        return {
          topicId: t.id,
          name: t.name,
          status: p?.status ?? "not_started",
          confidence: p?.confidence ?? null,
          completedAt: p?.completed_at ?? null,
        };
      }),
  }));

  return {
    templateId: student.curriculum_template_id,
    templateName: student.template.name,
    subjects: mapped,
  };
}

/** Kullanıcının görebildiği şablonlar (sistem + kurum); sistem şablonu önce. */
export async function listTemplates(): Promise<TemplateOption[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("curriculum_templates")
    .select("id, name, organization_id")
    .order("organization_id", { ascending: true, nullsFirst: true })
    .order("name");
  if (error) throw error;
  return data.map((t) => ({ id: t.id, name: t.name, isSystem: t.organization_id === null }));
}

function nestTopics(rows: TopicRow[], progressStudents: Map<string, number>): TemplateTopic[] {
  const build = (parentId: string | null): TemplateTopic[] =>
    rows
      .filter((r) => r.parent_id === parentId)
      .map((r) => ({
        id: r.id,
        name: r.name,
        sortOrder: r.sort_order,
        progressStudents: progressStudents.get(r.id) ?? 0,
        children: build(r.id),
      }));
  return build(null);
}

/** Konu başına ilerleme satırı olan öğrenci sayısı (RLS: koç kendi öğrencileri, owner kurum). */
async function countProgressStudentsByTopic(topicIds: string[]): Promise<Map<string, number>> {
  if (topicIds.length === 0) return new Map();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("student_topic_progress")
    .select("topic_id, student_id")
    .in("topic_id", topicIds);
  if (error) throw error;
  const students = new Map<string, Set<string>>();
  for (const row of data) {
    (students.get(row.topic_id) ?? students.set(row.topic_id, new Set()).get(row.topic_id)!).add(
      row.student_id,
    );
  }
  return new Map([...students].map(([topicId, set]) => [topicId, set.size]));
}

/** Şablon editörü: dersler ve iç içe konular (alt konular girintili gösterilir). */
export async function getTemplateEditor(templateId: string): Promise<TemplateEditor | null> {
  const supabase = await createClient();
  const { data: template, error } = await supabase
    .from("curriculum_templates")
    .select("id, name")
    .eq("id", templateId)
    .maybeSingle();
  if (error) throw error;
  if (!template) return null;

  const subjects = await listSubjectsWithTopics(templateId);
  const counts = await countProgressStudentsByTopic(
    subjects.flatMap((s) => s.topics.map((t) => t.id)),
  );
  const mapped: TemplateSubject[] = subjects.map((s) => ({
    subjectId: s.id,
    code: s.code,
    name: s.name,
    shortName: s.short_name,
    color: s.color,
    topics: nestTopics(s.topics, counts),
  }));
  return { templateId: template.id, name: template.name, subjects: mapped };
}

/** Bugün kartı: tamamlanan (tamamlandı + oturdu) / toplam ünite konusu. */
export async function getTopicCompletionSummary(
  studentId: string,
): Promise<{ done: number; total: number } | null> {
  const map = await getTopicMap(studentId);
  if (!map) return null;
  const statuses = map.subjects.flatMap((s) => s.topics.map((t) => t.status));
  return { done: countDone(statuses), total: statuses.length };
}
