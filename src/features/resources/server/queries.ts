import "server-only";

import { createClient } from "@/lib/supabase/server";
import type {
  CatalogRow,
  CatalogTitle,
  ResourceDetail,
  ResourceOptions,
  ResourceSection,
  SectionRow,
  StudentResourceDetail,
  StudentResourceRow,
} from "../types";

/**
 * Kaynak okuma sorguları (11 §2 Parça 1). Kullanıcının oturumuyla çalışır: RLS kurum kataloğunu
 * kurum içi herkese, özel kaynağı öğrenci / koçu / velisine açar. İlerleme görünümlerden
 * (`v_student_resource_progress`, `v_student_resource_sections`); ayrı tamamlanma tablosu yok.
 */

const RESOURCE_SELECT =
  "id, title, publisher, publish_year, type, template_id, subject_id, student_id, created_by, subject:subjects(name, short_name, color)" as const;

async function studentNames(ids: string[]): Promise<Map<string, string>> {
  if (ids.length === 0) return new Map();
  const supabase = await createClient();
  const { data, error } = await supabase.from("profiles").select("id, full_name").in("id", ids);
  if (error) throw error;
  return new Map(data.map((p) => [p.id, p.full_name]));
}

/** Koç kataloğu: kurum kataloğu + (koçun öğrencilerinin / owner'da hepsinin) özel kaynakları. */
export async function listCatalog(): Promise<{ shared: CatalogRow[]; studentAdded: CatalogRow[] }> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("resources")
    .select(
      `${RESOURCE_SELECT}, sections:resource_sections(count), assigned:student_resources(count)`,
    )
    .order("title");
  if (error) throw error;
  const names = await studentNames(data.flatMap((r) => (r.student_id ? [r.student_id] : [])));
  const rows: CatalogRow[] = data.map((r) => ({
    id: r.id,
    title: r.title,
    publisher: r.publisher,
    publishYear: r.publish_year,
    type: r.type,
    templateId: r.template_id,
    subjectId: r.subject_id,
    subjectShortName: r.subject?.short_name ?? null,
    subjectColor: r.subject?.color ?? null,
    studentId: r.student_id,
    studentName: r.student_id ? (names.get(r.student_id) ?? null) : null,
    sectionCount: r.sections[0]?.count ?? 0,
    assignedCount: r.assigned[0]?.count ?? 0,
  }));
  return {
    shared: rows.filter((r) => r.studentId === null),
    studentAdded: rows.filter((r) => r.studentId !== null),
  };
}

/** Benzer ad önerisi için okunabilen kaynak adları (öğrencide: atanmışlık bilgisiyle). */
export async function listCatalogTitles(studentId?: string): Promise<CatalogTitle[]> {
  const supabase = await createClient();
  const [{ data, error }, assigned] = await Promise.all([
    supabase
      .from("resources")
      .select("id, title, publisher, subject:subjects(short_name)")
      .order("title"),
    studentId
      ? supabase.from("student_resources").select("resource_id").eq("student_id", studentId)
      : Promise.resolve({ data: [] as { resource_id: string }[], error: null }),
  ]);
  if (error) throw error;
  if (assigned.error) throw assigned.error;
  const assignedSet = new Set(assigned.data.map((a) => a.resource_id));
  return data.map((r) => ({
    id: r.id,
    title: r.title,
    publisher: r.publisher,
    subjectShortName: r.subject?.short_name ?? null,
    assigned: assignedSet.has(r.id),
  }));
}

/** Form seçenekleri: şablonun dersleri + ünite düzeyi konuları. */
export async function getResourceOptions(templateId: string): Promise<ResourceOptions | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("curriculum_templates")
    .select(
      "id, subjects(id, name, short_name, color, sort_order, topics(id, name, sort_order, parent_id))",
    )
    .eq("id", templateId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    templateId: data.id,
    subjects: [...data.subjects]
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
      })),
  };
}

/** Koç formu için şablonlar (sistem önce): `?template=` seçimi, yoksa ilk. */
export async function listResourceTemplates(): Promise<
  { id: string; name: string; isSystem: boolean }[]
> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("curriculum_templates")
    .select("id, name, organization_id")
    .order("organization_id", { ascending: true, nullsFirst: true })
    .order("name");
  if (error) throw error;
  return data.map((t) => ({ id: t.id, name: t.name, isSystem: t.organization_id === null }));
}

/** Öğrencinin şablonu (öğrenci kaynak formu). */
export async function getStudentTemplateId(studentId: string): Promise<string | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("students")
    .select("curriculum_template_id")
    .eq("profile_id", studentId)
    .maybeSingle();
  if (error) throw error;
  return data?.curriculum_template_id ?? null;
}

function toSection(s: {
  id: string;
  resource_id: string;
  title: string;
  subject_id: string | null;
  topic_id: string | null;
  question_count: number | null;
  page_start: number | null;
  page_end: number | null;
  sort_order: number;
  topic: { name: string } | null;
}): ResourceSection {
  return {
    id: s.id,
    resourceId: s.resource_id,
    title: s.title,
    subjectId: s.subject_id,
    topicId: s.topic_id,
    topicName: s.topic?.name ?? null,
    questionCount: s.question_count,
    pageStart: s.page_start,
    pageEnd: s.page_end,
    sortOrder: s.sort_order,
  };
}

/** Kitap detayı (koç editörü, öğrencinin kendi özel kaynağı): testler sıralı + atanmış öğrenciler. */
export async function getResource(id: string): Promise<ResourceDetail | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("resources")
    .select(
      `${RESOURCE_SELECT}, sections:resource_sections(id, resource_id, title, subject_id, topic_id, question_count, page_start, page_end, sort_order, topic:topics(name)), assigned:student_resources(student_id)`,
    )
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const names = await studentNames([
    ...data.assigned.map((a) => a.student_id),
    ...(data.student_id ? [data.student_id] : []),
  ]);
  return {
    id: data.id,
    title: data.title,
    publisher: data.publisher,
    publishYear: data.publish_year,
    type: data.type,
    templateId: data.template_id,
    subjectId: data.subject_id,
    subjectName: data.subject?.name ?? null,
    subjectShortName: data.subject?.short_name ?? null,
    subjectColor: data.subject?.color ?? null,
    studentId: data.student_id,
    studentName: data.student_id ? (names.get(data.student_id) ?? null) : null,
    sections: [...data.sections]
      .sort((a, b) => a.sort_order - b.sort_order || a.title.localeCompare(b.title, "tr-TR"))
      .map(toSection),
    assigned: data.assigned
      .map((a) => ({ studentId: a.student_id, fullName: names.get(a.student_id) ?? "Öğrenci" }))
      .sort((a, b) => a.fullName.localeCompare(b.fullName, "tr-TR")),
  };
}

/** Atama paneli: koçun (RLS: owner'da kurumun) aktif öğrencileri + bu kaynağa atanmışlık. */
export async function listStudentsForAssign(
  resourceId: string,
): Promise<{ studentId: string; fullName: string; assigned: boolean }[]> {
  const supabase = await createClient();
  const [{ data, error }, assigned] = await Promise.all([
    supabase
      .from("students")
      .select("profile_id, status, profile:profiles!students_profile_id_fkey(full_name)")
      .eq("status", "active"),
    supabase.from("student_resources").select("student_id").eq("resource_id", resourceId),
  ]);
  if (error) throw error;
  if (assigned.error) throw assigned.error;
  const set = new Set(assigned.data.map((a) => a.student_id));
  return data
    .map((s) => ({
      studentId: s.profile_id,
      fullName: s.profile?.full_name ?? "Öğrenci",
      assigned: set.has(s.profile_id),
    }))
    .sort((a, b) => a.fullName.localeCompare(b.fullName, "tr-TR"));
}

/** Öğrencinin atanmış kaynakları + ilerleme (öğrenci listesi, K2 sekmesi). */
export async function listStudentResources(studentId: string): Promise<StudentResourceRow[]> {
  const supabase = await createClient();
  const [assigned, progress] = await Promise.all([
    supabase
      .from("student_resources")
      .select(`assigned_at, resource:resources(${RESOURCE_SELECT})`)
      .eq("student_id", studentId)
      .order("assigned_at", { ascending: false }),
    supabase.from("v_student_resource_progress").select("*").eq("student_id", studentId),
  ]);
  if (assigned.error) throw assigned.error;
  if (progress.error) throw progress.error;
  const byResource = new Map(progress.data.map((p) => [p.resource_id, p]));
  return assigned.data.flatMap((a) => {
    const r = a.resource;
    if (!r) return [];
    const p = byResource.get(r.id);
    return [
      {
        resourceId: r.id,
        title: r.title,
        publisher: r.publisher,
        type: r.type,
        subjectId: r.subject_id,
        subjectShortName: r.subject?.short_name ?? null,
        subjectColor: r.subject?.color ?? null,
        isOwn: r.student_id === studentId,
        sectionsTotal: p?.sections_total ?? 0,
        sectionsDone: p?.sections_done ?? 0,
        questionsTotal: p?.questions_total ?? 0,
        questionsDone: p?.questions_done ?? 0,
        percent: p?.percent ?? null,
        lastLogDate: p?.last_log_date ?? null,
      },
    ];
  });
}

/** Kitap detayı (öğrenci): testler, bitenler işaretli, açık plan bağı. */
export async function getStudentResource(
  studentId: string,
  resourceId: string,
): Promise<StudentResourceDetail | null> {
  const [rows, sections] = await Promise.all([
    listStudentResources(studentId),
    listStudentSections(studentId, resourceId),
  ]);
  const resource = rows.find((r) => r.resourceId === resourceId);
  if (!resource) return null;
  return { resource, sections };
}

/** `v_student_resource_sections` satırları (kaynak verilirse yalnızca o kaynak). */
export async function listStudentSections(
  studentId: string,
  resourceId?: string,
): Promise<SectionRow[]> {
  const supabase = await createClient();
  let query = supabase
    .from("v_student_resource_sections")
    .select("*")
    .eq("student_id", studentId)
    .order("resource_title")
    .order("sort_order");
  if (resourceId) query = query.eq("resource_id", resourceId);
  const { data, error } = await query;
  if (error) throw error;
  return data.map((s) => ({
    resourceId: s.resource_id ?? "",
    sectionId: s.section_id ?? "",
    title: s.section_title ?? "",
    subjectId: s.subject_id,
    subjectName: s.subject_name,
    subjectShortName: s.subject_short_name,
    subjectColor: s.subject_color,
    topicId: s.topic_id,
    topicName: s.topic_name,
    questionCount: s.question_count,
    pageStart: s.page_start,
    pageEnd: s.page_end,
    sortOrder: s.sort_order ?? 0,
    doneAt: s.done_at,
    logsCount: s.logs_count ?? 0,
    openPlanItemId: s.open_plan_item_id,
  }));
}
