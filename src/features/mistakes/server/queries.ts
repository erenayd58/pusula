import "server-only";

import { getOrgSettings } from "@/features/core";
import { dominantReasonSentence, reasonDistribution } from "@/lib/exam/mistakes";
import { createClient } from "@/lib/supabase/server";
import { BUCKET } from "../lib/storage";
import type {
  Mistake,
  MistakeFilters,
  MistakeOptions,
  ReasonDistribution,
  TopicMistakeCount,
} from "../types";

/**
 * Yanlış defteri okuma sorguları (10 §2 Parça 2). Kullanıcının oturumuyla çalışır: RLS öğrenci
 * kendisi, koç öğrencisi, veli yalnızca `can_view_details` (`can_read_mistakes`). Fotoğraflar
 * kısa süreli imzalı URL ile (liste 10 dk, detay 60 dk); depo politikası aynı kapıyı uygular.
 */

const LIST_URL_SECONDS = 600;
const DETAIL_URL_SECONDS = 3600;

const MISTAKE_SELECT =
  "id, student_id, subject_id, topic_id, mock_result_id, image_path, reason, note, status, solved_at, created_at, subject:subjects(name, short_name, color), topic:topics(name)" as const;

type MistakeRaw = {
  id: string;
  student_id: string;
  subject_id: string;
  topic_id: string | null;
  mock_result_id: string | null;
  image_path: string | null;
  reason: Mistake["reason"];
  note: string | null;
  status: Mistake["status"];
  solved_at: string | null;
  created_at: string;
  subject: { name: string; short_name: string; color: string } | null;
  topic: { name: string } | null;
};

async function signUrls(paths: string[], seconds: number): Promise<Map<string, string>> {
  if (paths.length === 0) return new Map();
  const supabase = await createClient();
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrls(paths, seconds);
  if (error) throw error;
  return new Map(data.flatMap((d) => (d.path && d.signedUrl ? [[d.path, d.signedUrl]] : [])));
}

function toMistake(r: MistakeRaw, urls: ReadonlyMap<string, string>): Mistake {
  return {
    id: r.id,
    studentId: r.student_id,
    subjectId: r.subject_id,
    subjectName: r.subject?.name ?? "",
    subjectShortName: r.subject?.short_name ?? "",
    subjectColor: r.subject?.color ?? "subject-math",
    topicId: r.topic_id,
    topicName: r.topic?.name ?? null,
    mockResultId: r.mock_result_id,
    imagePath: r.image_path,
    imageUrl: r.image_path ? (urls.get(r.image_path) ?? null) : null,
    reason: r.reason,
    note: r.note,
    status: r.status,
    solvedAt: r.solved_at,
    createdAt: r.created_at,
  };
}

/** Form seçenekleri: öğrencinin şablon dersleri + ünite konuları ve kurum (depo yolu öneki). */
export async function getMistakeOptions(studentId: string): Promise<MistakeOptions | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("students")
    .select(
      "organization_id, template:curriculum_templates(subjects(id, name, short_name, color, sort_order, topics(id, name, sort_order, parent_id)))",
    )
    .eq("profile_id", studentId)
    .maybeSingle();
  if (error) throw error;
  if (!data?.template) return null;
  return {
    organizationId: data.organization_id,
    subjects: [...data.template.subjects]
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((s) => ({
        subjectId: s.id,
        name: s.name,
        shortName: s.short_name,
        color: s.color,
        sortOrder: s.sort_order,
        topics: s.topics
          .filter((t) => t.parent_id === null)
          .sort((a, b) => a.sort_order - b.sort_order)
          .map((t) => ({ topicId: t.id, name: t.name })),
      })),
  };
}

/** Öğrencinin kayıtları (yeniden eskiye), filtrelerle; küçük görsel URL'leri 10 dk. */
export async function listMistakes(
  studentId: string,
  filters: MistakeFilters = {},
): Promise<Mistake[]> {
  const supabase = await createClient();
  let query = supabase
    .from("mistakes")
    .select(MISTAKE_SELECT)
    .eq("student_id", studentId)
    .order("created_at", { ascending: false });
  if (filters.subjectId) query = query.eq("subject_id", filters.subjectId);
  if (filters.status) query = query.eq("status", filters.status);
  if (filters.reason) query = query.eq("reason", filters.reason);
  const { data, error } = await query;
  if (error) throw error;
  const urls = await signUrls(
    data.flatMap((r) => (r.image_path ? [r.image_path] : [])),
    LIST_URL_SECONDS,
  );
  return data.map((r) => toMistake(r, urls));
}

/** Tek kayıt (detay; tam görüntü URL'si 60 dk); RLS satır vermezse null. */
export async function getMistake(id: string): Promise<Mistake | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("mistakes")
    .select(MISTAKE_SELECT)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const urls = await signUrls(data.image_path ? [data.image_path] : [], DETAIL_URL_SECONDS);
  return toMistake(data, urls);
}

/** Koç: son `alerts.lookback_days` içindeki kayıtların neden dağılımı + cümle. */
export async function getReasonDistribution(studentId: string): Promise<ReasonDistribution> {
  const [supabase, settings] = await Promise.all([createClient(), getOrgSettings()]);
  const lookbackDays = settings.alerts.lookback_days;
  const since = new Date(Date.now() - lookbackDays * 86_400_000).toISOString();
  const { data, error } = await supabase
    .from("mistakes")
    .select("reason")
    .eq("student_id", studentId)
    .gte("created_at", since);
  if (error) throw error;
  const slices = reasonDistribution(data);
  return { slices, total: data.length, lookbackDays, sentence: dominantReasonSentence(slices) };
}

/** Koç: konu bazlı kayıt sayısı (açık / çözülmüş), açık sayısına göre azalan; konusuz kayıtlar girmez. */
export async function getTopicMistakeCounts(studentId: string): Promise<TopicMistakeCount[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("mistakes")
    .select("topic_id, status, subject_id, subject:subjects(short_name, color), topic:topics(name)")
    .eq("student_id", studentId)
    .not("topic_id", "is", null);
  if (error) throw error;
  const out = new Map<string, TopicMistakeCount>();
  for (const r of data) {
    if (!r.topic_id || !r.topic) continue;
    const row =
      out.get(r.topic_id) ??
      out
        .set(r.topic_id, {
          topicId: r.topic_id,
          topicName: r.topic.name,
          subjectId: r.subject_id,
          subjectShortName: r.subject?.short_name ?? "",
          subjectColor: r.subject?.color ?? "subject-math",
          open: 0,
          solved: 0,
        })
        .get(r.topic_id)!;
    if (r.status === "solved") row.solved++;
    else row.open++;
  }
  return [...out.values()].sort(
    (a, b) =>
      b.open - a.open || b.solved - a.solved || a.topicName.localeCompare(b.topicName, "tr"),
  );
}
