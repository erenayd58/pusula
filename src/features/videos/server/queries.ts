import "server-only";

import { createClient } from "@/lib/supabase/server";
import type {
  CatalogTitle,
  PlaylistDetail,
  PlaylistRow,
  StudentPlaylistDetail,
  StudentPlaylistRow,
  StudentVideoRow,
  Video,
  VideoOptions,
} from "../types";
import { hasYoutubeApiKey } from "./youtube";

/**
 * Video okuma sorguları (11 §2 Parça 2). RLS: kurum kataloğu kurum içi herkese, özel liste
 * öğrenci / koçu / velisine. İlerleme görünümlerden (`v_student_playlist_progress`,
 * `v_student_playlist_videos`); izleme süresi yok.
 */

const PLAYLIST_SELECT =
  "id, title, channel_name, youtube_playlist_id, imported_at, template_id, subject_id, student_id, created_by, subject:subjects(name, short_name, color)" as const;

async function studentNames(ids: string[]): Promise<Map<string, string>> {
  if (ids.length === 0) return new Map();
  const supabase = await createClient();
  const { data, error } = await supabase.from("profiles").select("id, full_name").in("id", ids);
  if (error) throw error;
  return new Map(data.map((p) => [p.id, p.full_name]));
}

/** Koç kataloğu: kurum listeleri + öğrencilerin özel listeleri. */
export async function listCatalog(): Promise<{
  shared: PlaylistRow[];
  studentAdded: PlaylistRow[];
}> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("video_playlists")
    .select(`${PLAYLIST_SELECT}, videos(count), assigned:student_playlists(count)`)
    .order("title");
  if (error) throw error;
  const names = await studentNames(data.flatMap((p) => (p.student_id ? [p.student_id] : [])));
  const rows: PlaylistRow[] = data.map((p) => ({
    id: p.id,
    title: p.title,
    channelName: p.channel_name,
    youtubePlaylistId: p.youtube_playlist_id,
    templateId: p.template_id,
    subjectId: p.subject_id,
    subjectShortName: p.subject?.short_name ?? null,
    subjectColor: p.subject?.color ?? null,
    studentId: p.student_id,
    studentName: p.student_id ? (names.get(p.student_id) ?? null) : null,
    videoCount: p.videos[0]?.count ?? 0,
    assignedCount: p.assigned[0]?.count ?? 0,
    importedAt: p.imported_at,
  }));
  return {
    shared: rows.filter((r) => r.studentId === null),
    studentAdded: rows.filter((r) => r.studentId !== null),
  };
}

/** Benzer ad önerisi için liste adları (öğrencide atanmışlık bilgisiyle). */
export async function listCatalogTitles(studentId?: string): Promise<CatalogTitle[]> {
  const supabase = await createClient();
  const [{ data, error }, assigned] = await Promise.all([
    supabase
      .from("video_playlists")
      .select("id, title, channel_name, subject:subjects(short_name)")
      .order("title"),
    studentId
      ? supabase.from("student_playlists").select("playlist_id").eq("student_id", studentId)
      : Promise.resolve({ data: [] as { playlist_id: string }[], error: null }),
  ]);
  if (error) throw error;
  if (assigned.error) throw assigned.error;
  const set = new Set(assigned.data.map((a) => a.playlist_id));
  return data.map((p) => ({
    id: p.id,
    title: p.title,
    channelName: p.channel_name,
    subjectShortName: p.subject?.short_name ?? null,
    assigned: set.has(p.id),
  }));
}

/** Form seçenekleri: şablonun dersleri + ünite konuları + içe aktarma açık mı. */
export async function getVideoOptions(templateId: string): Promise<VideoOptions | null> {
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
    canImport: hasYoutubeApiKey(),
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

/** Koç formu için şablonlar (sistem önce). */
export async function listVideoTemplates(): Promise<
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

/** Öğrencinin şablonu. */
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

/** Liste detayı (koç editörü, öğrencinin özel listesi): videolar sıralı + atanmış öğrenciler. */
export async function getPlaylist(id: string): Promise<PlaylistDetail | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("video_playlists")
    .select(
      `${PLAYLIST_SELECT}, videos(id, playlist_id, youtube_video_id, title, duration_seconds, topic_id, sort_order, topic:topics(name)), assigned:student_playlists(student_id)`,
    )
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const names = await studentNames([
    ...data.assigned.map((a) => a.student_id),
    ...(data.student_id ? [data.student_id] : []),
  ]);
  const videos: Video[] = [...data.videos]
    .sort((a, b) => a.sort_order - b.sort_order || a.title.localeCompare(b.title, "tr-TR"))
    .map((v) => ({
      id: v.id,
      playlistId: v.playlist_id,
      youtubeVideoId: v.youtube_video_id,
      title: v.title,
      durationSeconds: v.duration_seconds,
      topicId: v.topic_id,
      topicName: v.topic?.name ?? null,
      sortOrder: v.sort_order,
    }));
  return {
    id: data.id,
    title: data.title,
    channelName: data.channel_name,
    youtubePlaylistId: data.youtube_playlist_id,
    importedAt: data.imported_at,
    templateId: data.template_id,
    subjectId: data.subject_id,
    subjectName: data.subject?.name ?? null,
    subjectShortName: data.subject?.short_name ?? null,
    subjectColor: data.subject?.color ?? null,
    studentId: data.student_id,
    studentName: data.student_id ? (names.get(data.student_id) ?? null) : null,
    videos,
    assigned: data.assigned
      .map((a) => ({ studentId: a.student_id, fullName: names.get(a.student_id) ?? "Öğrenci" }))
      .sort((a, b) => a.fullName.localeCompare(b.fullName, "tr-TR")),
  };
}

/** Atama paneli: aktif öğrenciler + bu listeye atanmışlık. */
export async function listStudentsForAssign(
  playlistId: string,
): Promise<{ studentId: string; fullName: string; assigned: boolean }[]> {
  const supabase = await createClient();
  const [{ data, error }, assigned] = await Promise.all([
    supabase
      .from("students")
      .select("profile_id, status, profile:profiles!students_profile_id_fkey(full_name)")
      .eq("status", "active"),
    supabase.from("student_playlists").select("student_id").eq("playlist_id", playlistId),
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

/** Öğrencinin atanmış listeleri + ilerleme (öğrenci listesi, K2 sekmesi). */
export async function listStudentPlaylists(studentId: string): Promise<StudentPlaylistRow[]> {
  const supabase = await createClient();
  const [assigned, progress] = await Promise.all([
    supabase
      .from("student_playlists")
      .select(`assigned_at, playlist:video_playlists(${PLAYLIST_SELECT})`)
      .eq("student_id", studentId)
      .order("assigned_at", { ascending: false }),
    supabase.from("v_student_playlist_progress").select("*").eq("student_id", studentId),
  ]);
  if (assigned.error) throw assigned.error;
  if (progress.error) throw progress.error;
  const byPlaylist = new Map(progress.data.map((p) => [p.playlist_id, p]));
  return assigned.data.flatMap((a) => {
    const p = a.playlist;
    if (!p) return [];
    const pr = byPlaylist.get(p.id);
    return [
      {
        playlistId: p.id,
        title: p.title,
        channelName: p.channel_name,
        subjectId: p.subject_id,
        subjectShortName: p.subject?.short_name ?? null,
        subjectColor: p.subject?.color ?? null,
        isOwn: p.student_id === studentId,
        videosTotal: pr?.videos_total ?? 0,
        videosWatched: pr?.videos_watched ?? 0,
        minutesTotal: pr?.minutes_total ?? 0,
        minutesRemaining: pr?.minutes_remaining ?? 0,
        percent: pr?.percent ?? null,
        lastWatchedAt: pr?.last_watched_at ?? null,
      },
    ];
  });
}

/** `v_student_playlist_videos` satırları (liste verilirse yalnızca o liste). */
export async function listStudentVideos(
  studentId: string,
  playlistId?: string,
): Promise<StudentVideoRow[]> {
  const supabase = await createClient();
  let query = supabase
    .from("v_student_playlist_videos")
    .select("*")
    .eq("student_id", studentId)
    .order("playlist_title")
    .order("sort_order");
  if (playlistId) query = query.eq("playlist_id", playlistId);
  const { data, error } = await query;
  if (error) throw error;
  return data.map((v) => ({
    playlistId: v.playlist_id ?? "",
    videoId: v.video_id ?? "",
    youtubeVideoId: v.youtube_video_id ?? "",
    title: v.title ?? "",
    durationSeconds: v.duration_seconds,
    subjectId: v.subject_id,
    subjectShortName: v.subject_short_name,
    subjectColor: v.subject_color,
    topicId: v.topic_id,
    topicName: v.topic_name,
    sortOrder: v.sort_order ?? 0,
    watchedAt: v.watched_at,
    note: v.note,
    openPlanItemId: v.open_plan_item_id,
  }));
}

/** Oynatıcı sayfası: liste + videolar. */
export async function getStudentPlaylist(
  studentId: string,
  playlistId: string,
): Promise<StudentPlaylistDetail | null> {
  const [rows, videos] = await Promise.all([
    listStudentPlaylists(studentId),
    listStudentVideos(studentId, playlistId),
  ]);
  const playlist = rows.find((r) => r.playlistId === playlistId);
  if (!playlist) return null;
  return { playlist, videos };
}

/** `/student/videos/watch/[videoId]` → liste kimliği (RLS okuyabiliyorsa). */
export async function resolveWatch(videoId: string): Promise<{ playlistId: string } | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("videos")
    .select("playlist_id")
    .eq("id", videoId)
    .maybeSingle();
  if (error) throw error;
  return data ? { playlistId: data.playlist_id } : null;
}
