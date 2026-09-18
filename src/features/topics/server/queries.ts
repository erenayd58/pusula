import "server-only";

import { getOrgSettings } from "@/features/core";
import { toDateKey, todayInIstanbul } from "@/lib/dates";
import { accuracyPercent } from "@/lib/exam/net";
import { topicPace, type PaceTopic, type TopicPace } from "@/lib/strategy/pace";
import { createClient } from "@/lib/supabase/server";
import { countDone, isDone } from "../lib/completion";
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

type TopicRow = {
  id: string;
  name: string;
  sort_order: number;
  parent_id: string | null;
  school_finish_on: string | null;
};

const SUBJECT_SELECT =
  "id, code, name, short_name, color, sort_order, topics(id, name, sort_order, parent_id, school_finish_on)";

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

  const [subjects, progress, stats, targets] = await Promise.all([
    listSubjectsWithTopics(student.curriculum_template_id),
    supabase
      .from("student_topic_progress")
      .select("topic_id, status, confidence, completed_at")
      .eq("student_id", studentId)
      .then(({ data, error }) => {
        if (error) throw error;
        return data;
      }),
    // Soru sayısı/başarı: question-log modülünün verisi, görünümle okunur (modüller arası kural).
    supabase
      .from("v_topic_question_stats")
      .select("topic_id, questions, correct")
      .eq("student_id", studentId)
      .then(({ data, error }) => {
        if (error) throw error;
        return data;
      }),
    // Konu hedef tarihleri (Faz 5b; RLS: öğrenci kendisi, koç öğrencisi, veli çocuğu).
    supabase
      .from("student_topic_targets")
      .select("topic_id, target_on")
      .eq("student_id", studentId)
      .then(({ data, error }) => {
        if (error) throw error;
        return data;
      }),
  ]);
  const byTopic = new Map(progress.map((p) => [p.topic_id, p]));
  const statsByTopic = new Map(stats.map((r) => [r.topic_id, r]));
  const targetByTopic = new Map(targets.map((t) => [t.topic_id, t.target_on]));

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
        const st = statsByTopic.get(t.id);
        const questions = st?.questions ?? 0;
        return {
          topicId: t.id,
          name: t.name,
          status: p?.status ?? "not_started",
          confidence: p?.confidence ?? null,
          completedAt: p?.completed_at ?? null,
          questions,
          accuracy: accuracyPercent(st?.correct ?? 0, questions),
          schoolFinishOn: t.school_finish_on,
          targetOn: targetByTopic.get(t.id) ?? null,
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
    .select("id, name, organization_id, exam_date")
    .order("organization_id", { ascending: true, nullsFirst: true })
    .order("name");
  if (error) throw error;
  return data.map((t) => ({
    id: t.id,
    name: t.name,
    isSystem: t.organization_id === null,
    examDate: t.exam_date,
  }));
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
        schoolFinishOn: r.school_finish_on,
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

/** Bugün kartı (Faz 5b, karar B7): gidişat (`topicPace`, saf) + hedef var mı. Şablon yoksa null. */
export type StudentPaceSummary = { pace: TopicPace; hasTargets: boolean };

export async function getStudentPaceSummary(studentId: string): Promise<StudentPaceSummary | null> {
  const supabase = await createClient();
  const [{ data: student, error }, facts, settings] = await Promise.all([
    supabase
      .from("students")
      .select("curriculum_template_id, topics_finish_by, exam_date")
      .eq("profile_id", studentId)
      .maybeSingle(),
    // Görünümle modüller arası okuma (karar #37): hedef tarihleri goals'un tablosundan.
    supabase
      .from("v_student_pace_facts")
      .select("topic_id, subject_id, status, completed_at, target_on")
      .eq("student_id", studentId)
      .then(({ data, error }) => {
        if (error) throw error;
        return data;
      }),
    getOrgSettings(),
  ]);
  if (error) throw error;
  if (!student?.curriculum_template_id) return null;

  const topics: PaceTopic[] = facts.flatMap((f) =>
    f.topic_id && f.subject_id && f.status
      ? [
          {
            topicId: f.topic_id,
            subjectId: f.subject_id,
            done: isDone(f.status),
            completedAt: f.completed_at,
            targetOn: f.target_on,
          },
        ]
      : [],
  );
  return {
    pace: topicPace(topics, {
      today: toDateKey(todayInIstanbul()),
      examOn: student.exam_date,
      windowDays: settings.strategy.pace_window_days,
    }),
    hasTargets: student.topics_finish_by !== null,
  };
}
