import "server-only";

import { getOrgSettings } from "@/features/core";
import { toDateKey, todayInIstanbul } from "@/lib/dates";
import {
  netDeltas,
  recentSubjectWrong,
  topicMarkCounts,
  totalNet,
  type MockPoint,
  type SubjectNet,
} from "@/lib/exam/mock";
import { wrongPenaltyOf } from "@/lib/exam/net";
import { createClient } from "@/lib/supabase/server";
import type {
  CatalogTemplate,
  ExamComparison,
  MockExam,
  MockOptions,
  MockResultDetail,
  MockResultSummary,
  MockSubject,
  SubjectProgressRow,
  TopicMarkRow,
  TrendData,
} from "../types";

/**
 * Denemeler okuma sorguları (10 §2 Parça 1). Kullanıcının oturumuyla çalışır (RLS: öğrenci
 * kendisi, koç öğrencisi, veli çocuğu; katalog kurum). Tanımlar `lib/exam/mock` ile tek yerde:
 * genel deneme = branş dersi boş; toplam net yalnızca genel denemede; son N = tarih sırasıyla.
 */

const RESULT_SELECT =
  "id, student_id, mock_exam_id, custom_title, subject_id, taken_on, duration_minutes, score, percentile, note, created_at, exam:mock_exams(title, subject_id), subject_results:mock_exam_subject_results(subject_id, correct_count, wrong_count, blank_count, net), topic_mistakes:mock_exam_topic_mistakes(topic_id)" as const;

type ResultRaw = {
  id: string;
  student_id: string;
  mock_exam_id: string | null;
  custom_title: string | null;
  subject_id: string | null;
  taken_on: string;
  duration_minutes: number | null;
  score: number | null;
  percentile: number | null;
  note: string | null;
  created_at: string;
  exam: { title: string; subject_id: string | null } | null;
  subject_results: {
    subject_id: string;
    correct_count: number;
    wrong_count: number;
    blank_count: number;
    net: number | null;
  }[];
  topic_mistakes: { topic_id: string }[];
};

type Loaded = {
  raw: ResultRaw;
  point: MockPoint;
  /** Etkin branş dersi (katalog ya da serbest); genel → null. */
  branchSubjectId: string | null;
};

/** Şablon dersleri (ünite konularıyla) ve net kuralı; şablon atanmamışsa null. */
async function loadTemplate(
  studentId: string,
): Promise<{ templateId: string; subjects: MockSubject[]; wrongPenalty: number } | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("students")
    .select(
      "curriculum_template_id, template:curriculum_templates(scoring, subjects(id, name, short_name, color, sort_order, exam_question_count, topics(id, name, sort_order, parent_id)))",
    )
    .eq("profile_id", studentId)
    .maybeSingle();
  if (error) throw error;
  if (!data?.template || !data.curriculum_template_id) return null;
  const subjects: MockSubject[] = [...data.template.subjects]
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((s) => ({
      subjectId: s.id,
      name: s.name,
      shortName: s.short_name,
      color: s.color,
      sortOrder: s.sort_order,
      questionCount: s.exam_question_count,
      topics: s.topics
        .filter((t) => t.parent_id === null)
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((t) => ({ topicId: t.id, name: t.name })),
    }));
  return {
    templateId: data.curriculum_template_id,
    subjects,
    wrongPenalty: wrongPenaltyOf(data.template.scoring),
  };
}

function toLoaded(r: ResultRaw, subjects: readonly MockSubject[]): Loaded {
  const byId = new Map(subjects.map((s) => [s.subjectId, s]));
  const branchSubjectId = r.subject_id ?? r.exam?.subject_id ?? null;
  const rows: SubjectNet[] = r.subject_results
    .map((sr) => ({
      subjectId: sr.subject_id,
      correct: sr.correct_count,
      wrong: sr.wrong_count,
      blank: sr.blank_count,
      net: Number(sr.net ?? 0),
      questionCount: byId.get(sr.subject_id)?.questionCount ?? null,
    }))
    .sort(
      (a, b) => (byId.get(a.subjectId)?.sortOrder ?? 0) - (byId.get(b.subjectId)?.sortOrder ?? 0),
    );
  return {
    raw: r,
    branchSubjectId,
    point: {
      resultId: r.id,
      title: r.exam?.title ?? r.custom_title ?? "Deneme",
      takenOn: r.taken_on,
      isBranch: branchSubjectId !== null,
      totalNet: totalNet(rows),
      subjects: rows,
    },
  };
}

/** Öğrencinin tüm sonuçları tarih sırasıyla (eskiden yeniye; `taken_on asc, created_at asc`). */
async function loadResults(studentId: string, subjects: readonly MockSubject[]): Promise<Loaded[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("mock_exam_results")
    .select(RESULT_SELECT)
    .eq("student_id", studentId)
    .order("taken_on", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data.map((r) => toLoaded(r, subjects));
}

function toSummary(
  l: Loaded,
  deltas: ReadonlyMap<string, number | null>,
  subjects: readonly MockSubject[],
): MockResultSummary {
  const branch = l.branchSubjectId
    ? subjects.find((s) => s.subjectId === l.branchSubjectId)
    : undefined;
  return {
    id: l.raw.id,
    title: l.point.title,
    takenOn: l.raw.taken_on,
    isBranch: l.point.isBranch,
    branchSubject: branch
      ? { subjectId: branch.subjectId, shortName: branch.shortName, color: branch.color }
      : null,
    totalNet: l.point.totalNet,
    delta: deltas.get(l.raw.id) ?? null,
    mockExamId: l.raw.mock_exam_id,
  };
}

/** Sihirbaz seçenekleri: dersler, net kuralı, şablondaki katalog (girilenler işaretli). */
export async function getMockOptions(studentId: string): Promise<MockOptions | null> {
  const template = await loadTemplate(studentId);
  if (!template) return null;
  const supabase = await createClient();
  const [{ data: exams, error }, { data: entered, error: enteredError }] = await Promise.all([
    supabase
      .from("mock_exams")
      .select("id, title, publisher, exam_date, subject_id, subject:subjects(short_name)")
      .eq("template_id", template.templateId)
      .order("exam_date", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false }),
    supabase
      .from("mock_exam_results")
      .select("id, mock_exam_id")
      .eq("student_id", studentId)
      .not("mock_exam_id", "is", null),
  ]);
  if (error) throw error;
  if (enteredError) throw enteredError;
  const enteredByExam = new Map(entered.map((r) => [r.mock_exam_id, r.id]));
  return {
    subjects: template.subjects,
    wrongPenalty: template.wrongPenalty,
    exams: exams.map((e) => ({
      id: e.id,
      title: e.title,
      publisher: e.publisher,
      examDate: e.exam_date,
      subjectId: e.subject_id,
      subjectShortName: e.subject?.short_name ?? null,
      enteredResultId: enteredByExam.get(e.id) ?? null,
    })),
    today: toDateKey(todayInIstanbul()),
  };
}

/** Katalog formu seçenekleri: görünür şablonlar (sistem + kurum) ve dersleri (branş seçimi). */
export async function listCatalogTemplates(): Promise<CatalogTemplate[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("curriculum_templates")
    .select("id, name, organization_id, subjects(id, name, short_name, sort_order)")
    .order("organization_id", { ascending: true, nullsFirst: true })
    .order("name");
  if (error) throw error;
  return data.map((t) => ({
    id: t.id,
    name: t.name,
    isSystem: t.organization_id === null,
    subjects: [...t.subjects]
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((s) => ({ subjectId: s.id, name: s.name, shortName: s.short_name })),
  }));
}

/** Kurum kataloğu (koç): şablon verilirse yalnızca o şablon; giren öğrenci sayısıyla. */
export async function listMockExams(templateId?: string): Promise<MockExam[]> {
  const supabase = await createClient();
  let query = supabase
    .from("mock_exams")
    .select(
      "id, template_id, title, publisher, exam_date, subject_id, subject:subjects(short_name), results:mock_exam_results(count)",
    )
    .order("exam_date", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });
  if (templateId) query = query.eq("template_id", templateId);
  const { data, error } = await query;
  if (error) throw error;
  return data.map((e) => ({
    id: e.id,
    templateId: e.template_id,
    title: e.title,
    publisher: e.publisher,
    examDate: e.exam_date,
    subjectId: e.subject_id,
    subjectShortName: e.subject?.short_name ?? null,
    resultCount: e.results[0]?.count ?? 0,
  }));
}

export async function getMockExam(id: string): Promise<MockExam | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("mock_exams")
    .select(
      "id, template_id, title, publisher, exam_date, subject_id, subject:subjects(short_name), results:mock_exam_results(count)",
    )
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    id: data.id,
    templateId: data.template_id,
    title: data.title,
    publisher: data.publisher,
    examDate: data.exam_date,
    subjectId: data.subject_id,
    subjectShortName: data.subject?.short_name ?? null,
    resultCount: data.results[0]?.count ?? 0,
  };
}

/** Öğrencinin sonuçları (en yeni önce) + önceki genel denemeye göre değişim. */
export async function listStudentResults(studentId: string): Promise<MockResultSummary[]> {
  const template = await loadTemplate(studentId);
  if (!template) return [];
  const loaded = await loadResults(studentId, template.subjects);
  const deltas = netDeltas(loaded.map((l) => l.point));
  return loaded.map((l) => toSummary(l, deltas, template.subjects)).reverse();
}

/** Tek sonucun detayı: ders satırları (önceki genel denemeye göre değişimle), işaretli konular. */
export async function getResultDetail(resultId: string): Promise<MockResultDetail | null> {
  const supabase = await createClient();
  const { data: row, error } = await supabase
    .from("mock_exam_results")
    .select(RESULT_SELECT)
    .eq("id", resultId)
    .maybeSingle();
  if (error) throw error;
  if (!row) return null;
  const template = await loadTemplate(row.student_id);
  if (!template) return null;
  const loaded = await loadResults(row.student_id, template.subjects);
  const index = loaded.findIndex((l) => l.raw.id === resultId);
  const current = index >= 0 ? loaded[index]! : toLoaded(row, template.subjects);
  const deltas = netDeltas(loaded.map((l) => l.point));
  // Ders değişimi: bu genel denemeden önceki genel deneme (branşta yok).
  const prevGeneral = current.point.isBranch
    ? undefined
    : loaded
        .slice(0, Math.max(0, index))
        .reverse()
        .find((l) => !l.point.isBranch);
  const prevNets = new Map(prevGeneral?.point.subjects.map((s) => [s.subjectId, s.net]) ?? []);
  const topicNames = new Map(
    template.subjects.flatMap((s) =>
      s.topics.map((t) => [t.topicId, { name: t.name, subjectId: s.subjectId }]),
    ),
  );
  const subjectMeta = new Map(template.subjects.map((s) => [s.subjectId, s]));

  return {
    ...toSummary(current, deltas, template.subjects),
    studentId: row.student_id,
    customTitle: row.custom_title,
    subjectId: row.subject_id,
    durationMinutes: row.duration_minutes,
    score: row.score === null ? null : Number(row.score),
    percentile: row.percentile === null ? null : Number(row.percentile),
    note: row.note,
    subjects: current.point.subjects.map((s) => {
      const meta = subjectMeta.get(s.subjectId);
      const prev = prevNets.get(s.subjectId);
      return {
        subjectId: s.subjectId,
        name: meta?.name ?? "Ders",
        shortName: meta?.shortName ?? "—",
        color: meta?.color ?? "subject-r3",
        correct: s.correct,
        wrong: s.wrong,
        blank: s.blank,
        net: s.net,
        questionCount: s.questionCount,
        delta: prev === undefined ? null : Math.round((s.net - prev) * 100) / 100,
      };
    }),
    topics: row.topic_mistakes.flatMap((t) => {
      const meta = topicNames.get(t.topic_id);
      return meta ? [{ topicId: t.topic_id, name: meta.name, subjectId: meta.subjectId }] : [];
    }),
  };
}

/** Genel denemeler tarih sırasıyla (grafik / kart listesi) + ders bilgisi. */
export async function getTrend(studentId: string): Promise<TrendData> {
  const template = await loadTemplate(studentId);
  if (!template) return { points: [], subjects: [] };
  const loaded = await loadResults(studentId, template.subjects);
  return {
    points: loaded.map((l) => l.point).filter((p) => !p.isBranch),
    subjects: template.subjects,
  };
}

/**
 * Son `n` genel denemede işaret sayısına göre konular (azalan). `n` verilmezse kurum ayarı
 * `mock_exams.recent_count`. `limit` ile kırpılır.
 */
export async function getTopicMarkCounts(
  studentId: string,
  n?: number,
  limit = 10,
): Promise<TopicMarkRow[]> {
  const [template, settings] = await Promise.all([loadTemplate(studentId), getOrgSettings()]);
  if (!template) return [];
  const recent = n ?? settings.mock_exams.recent_count;
  const loaded = await loadResults(studentId, template.subjects);
  const recentGeneral = loaded.filter((l) => !l.point.isBranch).slice(-recent);
  const recentIds = new Set(recentGeneral.map((l) => l.raw.id));
  const marks = loaded.flatMap((l) =>
    l.raw.topic_mistakes.map((t) => ({ resultId: l.raw.id, topicId: t.topic_id })),
  );
  const topicMeta = new Map(
    template.subjects.flatMap((s) =>
      s.topics.map((t) => [
        t.topicId,
        { name: t.name, subjectId: s.subjectId, shortName: s.shortName, color: s.color },
      ]),
    ),
  );
  return topicMarkCounts(marks, recentIds)
    .flatMap((c) => {
      const meta = topicMeta.get(c.topicId);
      return meta
        ? [
            {
              topicId: c.topicId,
              name: meta.name,
              subjectId: meta.subjectId,
              subjectShortName: meta.shortName,
              subjectColor: meta.color,
              count: c.count,
              exams: recentGeneral.length,
            },
          ]
        : [];
    })
    .slice(0, limit);
}

/** Ders başına son / önceki / son N ortalaması / değişim (K2 "Ders bazlı net gelişimi"). */
export async function getSubjectProgress(studentId: string): Promise<SubjectProgressRow[]> {
  const [template, settings] = await Promise.all([loadTemplate(studentId), getOrgSettings()]);
  if (!template) return [];
  const loaded = await loadResults(studentId, template.subjects);
  const points = loaded.map((l) => l.point);
  const n = settings.mock_exams.recent_count;
  const window = recentSubjectWrong(points, n);
  return template.subjects.map((s) => {
    // Dersin serisi: genel denemeler + bu dersin branşları (tarih sırasıyla).
    const nets = points.flatMap((p) => {
      const row = p.subjects.find((r) => r.subjectId === s.subjectId);
      return row ? [row.net] : [];
    });
    const last = nets.at(-1) ?? null;
    const prev = nets.length >= 2 ? nets[nets.length - 2]! : null;
    const recent = nets.slice(-n);
    const avg =
      recent.length > 0
        ? Math.round((recent.reduce((a, b) => a + b, 0) / recent.length) * 100) / 100
        : null;
    return {
      subjectId: s.subjectId,
      name: s.name,
      shortName: s.shortName,
      color: s.color,
      last,
      prev,
      avg,
      delta: last !== null && prev !== null ? Math.round((last - prev) * 100) / 100 : null,
      exams: window.get(s.subjectId)?.exams ?? 0,
    };
  });
}

/**
 * Aynı katalog denemesini giren öğrenciler × ders netleri + toplam (toplam nete göre sıralı) ve
 * ortalama satırı. Yalnızca koç ekranı; RLS koçun öğrencileriyle sınırlar.
 */
export async function getExamComparison(examId: string): Promise<ExamComparison | null> {
  const exam = await getMockExam(examId);
  if (!exam) return null;
  const supabase = await createClient();
  const [{ data: subjectRows, error: subjectError }, { data: results, error }] = await Promise.all([
    supabase
      .from("subjects")
      .select("id, name, short_name, color, sort_order")
      .eq("template_id", exam.templateId)
      .order("sort_order"),
    supabase
      .from("mock_exam_results")
      .select(
        "id, student_id, student:students!mock_exam_results_student_id_fkey(profile:profiles!students_profile_id_fkey(full_name)), subject_results:mock_exam_subject_results(subject_id, net)",
      )
      .eq("mock_exam_id", examId),
  ]);
  if (subjectError) throw subjectError;
  if (error) throw error;
  const subjects = subjectRows
    .filter((s) => exam.subjectId === null || s.id === exam.subjectId)
    .map((s) => ({ subjectId: s.id, name: s.name, shortName: s.short_name, color: s.color }));
  const rows = results
    .map((r) => {
      const nets: Record<string, number> = {};
      for (const sr of r.subject_results) nets[sr.subject_id] = Number(sr.net ?? 0);
      return {
        studentId: r.student_id,
        fullName: r.student.profile.full_name,
        totalNet: totalNet(
          r.subject_results.map((sr) => ({
            subjectId: sr.subject_id,
            correct: 0,
            wrong: 0,
            blank: 0,
            net: Number(sr.net ?? 0),
            questionCount: null,
          })),
        ),
        nets,
      };
    })
    .sort((a, b) => b.totalNet - a.totalNet || a.fullName.localeCompare(b.fullName, "tr"));
  const average =
    rows.length > 0
      ? {
          totalNet:
            Math.round((rows.reduce((a, r) => a + r.totalNet, 0) / rows.length) * 100) / 100,
          nets: Object.fromEntries(
            subjects.map((s) => [
              s.subjectId,
              Math.round(
                (rows.reduce((a, r) => a + (r.nets[s.subjectId] ?? 0), 0) / rows.length) * 100,
              ) / 100,
            ]),
          ),
        }
      : null;
  return { exam, subjects, rows, average };
}
