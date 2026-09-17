import "server-only";

import { getOrgSettings } from "@/features/core";
import { toDateKey, todayInIstanbul, weekStart } from "@/lib/dates";
import { createClient } from "@/lib/supabase/server";
import type { PlanItemKind } from "@/types";
import type { PlannerDefaults } from "../lib/estimate";
import type {
  CoachPlanRow,
  PlanCompletion,
  PlanItem,
  PlanSubjectOption,
  TargetUnit,
  TaskPoolItem,
  WeekPlan,
} from "../types";

/**
 * Plan okuma sorguları. Oturumla çalışır: koç/owner her durumdaki planı, öğrenci ve veli
 * yalnızca yayınlanmış planı görür (RLS). Hafta anahtarı `YYYY-MM-DD` pazartesi.
 */

const ITEM_SELECT =
  "id, plan_id, day_of_week, sort_order, kind, title, subject_id, topic_id, url, target_value, target_unit, estimated_minutes, completed_at, student_note, postponed_from, postponed_at, subject:subjects(name, short_name, color), topic:topics(name)" as const;

type ItemRaw = {
  id: string;
  plan_id: string;
  day_of_week: number | null;
  sort_order: number;
  kind: PlanItemKind;
  title: string;
  subject_id: string | null;
  topic_id: string | null;
  url: string | null;
  target_value: number | null;
  target_unit: string | null;
  estimated_minutes: number;
  completed_at: string | null;
  student_note: string | null;
  postponed_from: number | null;
  postponed_at: string | null;
  subject: { name: string; short_name: string; color: string } | null;
  topic: { name: string } | null;
};

function toItem(r: ItemRaw): PlanItem {
  return {
    id: r.id,
    planId: r.plan_id,
    dayOfWeek: r.day_of_week,
    sortOrder: r.sort_order,
    kind: r.kind,
    title: r.title,
    subjectId: r.subject_id,
    subjectName: r.subject?.name ?? null,
    subjectShortName: r.subject?.short_name ?? null,
    subjectColor: r.subject?.color ?? null,
    topicId: r.topic_id,
    topicName: r.topic?.name ?? null,
    url: r.url,
    targetValue: r.target_value,
    targetUnit: r.target_unit === "questions" || r.target_unit === "minutes" ? r.target_unit : null,
    estimatedMinutes: r.estimated_minutes,
    completedAt: r.completed_at,
    studentNote: r.student_note,
    postponedFrom: r.postponed_from,
    postponedAt: r.postponed_at,
  };
}

const byDayAndOrder = (a: PlanItem, b: PlanItem) =>
  (a.dayOfWeek ?? 8) - (b.dayOfWeek ?? 8) || a.sortOrder - b.sortOrder;

/** Haftanın planı (görevleriyle); yoksa ya da görünmüyorsa null. */
export async function getWeekPlan(studentId: string, week: string): Promise<WeekPlan | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("weekly_plans")
    .select(
      `id, student_id, week_start, status, coach_message, student_reflection, published_at, updated_at, items:plan_items(${ITEM_SELECT})`,
    )
    .eq("student_id", studentId)
    .eq("week_start", week)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    id: data.id,
    studentId: data.student_id,
    weekStart: data.week_start,
    status: data.status,
    coachMessage: data.coach_message,
    studentReflection: data.student_reflection,
    publishedAt: data.published_at,
    updatedAt: data.updated_at,
    items: data.items.map(toItem).sort(byDayAndOrder),
  };
}

/** Bugün kartı: bu haftanın yayınlanmış planından bugünün ve "bu hafta içinde" görevleri. */
export async function getTodayPlanItems(studentId: string): Promise<{
  weekStart: string;
  today: PlanItem[];
  anytime: PlanItem[];
  hasPlan: boolean;
}> {
  const now = todayInIstanbul();
  const week = toDateKey(weekStart(now));
  const isoDay = ((now.getDay() + 6) % 7) + 1;
  const plan = await getWeekPlan(studentId, week);
  if (!plan || plan.status !== "published") {
    return { weekStart: week, today: [], anytime: [], hasPlan: false };
  }
  return {
    weekStart: week,
    today: plan.items.filter((i) => i.dayOfWeek === isoDay),
    anytime: plan.items.filter((i) => i.dayOfWeek === null),
    hasPlan: true,
  };
}

/** Görev formu seçenekleri: dersler + ünite konuları, ders tempoları, kurum varsayılanları. */
export async function getPlanOptions(studentId: string): Promise<{
  subjects: PlanSubjectOption[];
  pace: Record<string, number>;
  defaults: PlannerDefaults;
}> {
  const supabase = await createClient();
  const [{ data, error }, paceRes, settings] = await Promise.all([
    supabase
      .from("students")
      .select(
        "template:curriculum_templates(subjects(id, name, short_name, color, sort_order, topics(id, name, sort_order, parent_id)))",
      )
      .eq("profile_id", studentId)
      .maybeSingle(),
    supabase
      .from("v_student_subject_pace")
      .select("subject_id, minutes_per_question")
      .eq("student_id", studentId),
    getOrgSettings(),
  ]);
  if (error) throw error;
  if (paceRes.error) throw paceRes.error;

  const subjects: PlanSubjectOption[] = data?.template
    ? [...data.template.subjects]
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((s) => ({
          subjectId: s.id,
          name: s.name,
          shortName: s.short_name,
          color: s.color,
          topics: s.topics
            .filter((t) => t.parent_id === null)
            .sort((a, b) => a.sort_order - b.sort_order)
            .map((t) => ({ topicId: t.id, name: t.name })),
        }))
    : [];
  const pace: Record<string, number> = {};
  for (const p of paceRes.data) {
    if (p.subject_id && p.minutes_per_question) pace[p.subject_id] = Number(p.minutes_per_question);
  }
  return { subjects, pace, defaults: settings.planner };
}

/** Koçun son 20 farklı görevi (havuz "sık kullanılan" kategorisi). */
export async function getFrequentTasks(coachId: string): Promise<TaskPoolItem[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("plan_items")
    .select(
      "kind, title, subject_id, topic_id, url, target_value, target_unit, estimated_minutes, created_at, plan:weekly_plans!inner(created_by)",
    )
    .eq("plan.created_by", coachId)
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw error;
  const seen = new Set<string>();
  const out: TaskPoolItem[] = [];
  for (const r of data) {
    const key = `${r.kind}|${r.title}|${r.subject_id ?? ""}|${r.topic_id ?? ""}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      key: `frequent:${key}`,
      categoryId: "frequent",
      kind: r.kind,
      title: r.title,
      subjectId: r.subject_id,
      topicId: r.topic_id,
      targetValue: r.target_value,
      targetUnit: (r.target_unit as TargetUnit | null) ?? null,
      estimatedMinutes: r.estimated_minutes,
      url: r.url ?? undefined,
    });
    if (out.length >= 20) break;
  }
  return out;
}

export async function getPlanCompletion(
  studentId: string,
  week: string,
): Promise<PlanCompletion | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("v_plan_completion")
    .select("plan_id, week_start, status, items_total, items_completed, postponed_count, percent")
    .eq("student_id", studentId)
    .eq("week_start", week)
    .maybeSingle();
  if (error) throw error;
  if (!data || !data.plan_id || !data.week_start || !data.status) return null;
  return {
    planId: data.plan_id,
    weekStart: data.week_start,
    status: data.status,
    itemsTotal: data.items_total ?? 0,
    itemsCompleted: data.items_completed ?? 0,
    postponedCount: data.postponed_count ?? 0,
    percent: data.percent,
  };
}

/** Koç "Planlar" sayfası: öğrenci başına o haftanın plan durumu. */
export async function listCoachPlans(week: string): Promise<CoachPlanRow[]> {
  const supabase = await createClient();
  const [studentsRes, plansRes] = await Promise.all([
    supabase
      .from("v_coach_student_overview")
      .select("student_id, full_name, status")
      .eq("status", "active")
      .order("full_name"),
    supabase
      .from("v_plan_completion")
      .select("student_id, status, items_total, items_completed, percent")
      .eq("week_start", week),
  ]);
  if (studentsRes.error) throw studentsRes.error;
  if (plansRes.error) throw plansRes.error;
  const plans = new Map(plansRes.data.map((p) => [p.student_id, p]));
  return studentsRes.data
    .filter((s): s is typeof s & { student_id: string; full_name: string } =>
      Boolean(s.student_id && s.full_name),
    )
    .map((s) => {
      const p = plans.get(s.student_id);
      return {
        studentId: s.student_id,
        fullName: s.full_name,
        status: p?.status ?? null,
        itemsTotal: p?.items_total ?? 0,
        itemsCompleted: p?.items_completed ?? 0,
        percent: p?.percent ?? null,
      };
    });
}

/** Kopyalama onayı için: hedef öğrencilerin o haftadaki mevcut görev sayısı. */
export async function getExistingItemCounts(
  studentIds: string[],
  week: string,
): Promise<Record<string, number>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("v_plan_completion")
    .select("student_id, items_total")
    .eq("week_start", week)
    .in("student_id", studentIds);
  if (error) throw error;
  const out: Record<string, number> = {};
  for (const r of data) if (r.student_id) out[r.student_id] = r.items_total ?? 0;
  return out;
}
