"use server";

import { ActionError, createAction } from "@/lib/actions/create-action";
import { formatCount } from "@/lib/format";
import type { ServerSupabaseClient } from "@/lib/supabase/server";
import { YOUTUBE_MAX_VIDEOS, YoutubeError, youtubeErrorMessage } from "@/lib/youtube/client";
import { parseYoutubeUrl } from "@/lib/youtube/url";
import {
  addVideoSchema,
  assignPlaylistSchema,
  createPlaylistSchema,
  importPlaylistSchema,
  markWatchedSchema,
  playlistIdSchema,
  setVideoTopicsSchema,
  unassignPlaylistSchema,
  updatePlaylistSchema,
  updateVideoSchema,
  videoIdSchema,
  videoNoteSchema,
} from "../schemas";
import { fetchPlaylist, fetchVideo, hasYoutubeApiKey } from "./youtube";

const NOT_ALLOWED = "Bu işlem için yetkin yok.";
const NOT_FOUND = "Liste bulunamadı; sayfayı yenile.";

/** Video değişikliği sonrası tazelenen yollar (11 §5). */
const PATHS = ["/student/videos", "/coach/videos", "/coach/students", "/coach/plans"] as const;
const WATCH_PATHS = [...PATHS, "/student/plan", "/student/today"] as const;

function rpcMessage(message: string): string {
  if (message.includes("invalid_template"))
    return "Liste yalnızca kendi konu listene (şablon) eklenebilir.";
  if (message.includes("invalid_subject")) return "Ders bu şablonda yok.";
  if (message.includes("invalid_topic")) return "Konu bu şablonda değil.";
  if (message.includes("too_many_videos"))
    return `Bir listede en fazla ${YOUTUBE_MAX_VIDEOS} video.`;
  return "Liste kaydedilemedi. Tekrar dene.";
}

/** Öğrenci yalnızca kendi adına yazar; koç/owner için RLS/RPC öğrencisiyle sınırlar. */
function assertOwn(role: string, userId: string, studentId: string) {
  if (role === "student" && studentId !== userId) throw new ActionError(NOT_ALLOWED);
}

async function playlistSubject(supabase: ServerSupabaseClient, playlistId: string) {
  const { data, error } = await supabase
    .from("video_playlists")
    .select("subject_id, template_id")
    .eq("id", playlistId)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new ActionError(NOT_FOUND);
  return data;
}

/** Konu, listenin (varsa) dersine; yoksa şablonun herhangi bir dersine ait olmalı. */
async function assertTopic(
  supabase: ServerSupabaseClient,
  topicId: string | null,
  playlist: { subject_id: string | null; template_id: string },
) {
  if (!topicId) return;
  const { data, error } = await supabase
    .from("topics")
    .select("subject_id, subject:subjects(template_id)")
    .eq("id", topicId)
    .maybeSingle();
  if (error) throw error;
  if (
    !data ||
    data.subject?.template_id !== playlist.template_id ||
    (playlist.subject_id && data.subject_id !== playlist.subject_id)
  ) {
    throw new ActionError("Konu listenin dersine ait değil.");
  }
}

/**
 * YouTube liste bağlantısından içe aktar: sunucu API'yi çağırır, `create_playlist` RPC'si liste +
 * videoları tek transaction'da yazar (öğrenci: özel + kendine atama). Aynı liste zaten varsa 23505.
 */
export const importPlaylist = createAction({
  name: "importPlaylist",
  schema: importPlaylistSchema,
  roles: ["student", "coach", "owner"],
  revalidate: PATHS,
  handler: async (input, ctx) => {
    const parsed = parseYoutubeUrl(input.url);
    const listId = parsed?.kind === "playlist" ? parsed.id : parsed?.listId;
    if (!listId) throw new ActionError("Bağlantı bir YouTube oynatma listesi değil.");
    let imported;
    try {
      imported = await fetchPlaylist(listId);
    } catch (error) {
      throw new ActionError(youtubeErrorMessage(error));
    }
    const { data, error } = await ctx.supabase.rpc("create_playlist", {
      p_playlist: {
        template_id: input.templateId,
        subject_id: input.subjectId,
        title: imported.title,
        channel_name: imported.channelName,
        youtube_playlist_id: listId,
      },
      p_videos: imported.videos.map((v) => ({
        youtube_video_id: v.youtubeVideoId,
        title: v.title,
        duration_seconds: v.durationSeconds,
        sort_order: v.sortOrder,
      })),
      p_assign_self: ctx.profile.role === "student",
    });
    if (error) {
      if (error.code === "42501") throw new ActionError(NOT_ALLOWED);
      if (error.code === "23505")
        throw new ActionError("Bu liste zaten katalogda; listeden aç ya da kendine ata.");
      if (error.code === "22023") throw new ActionError(rpcMessage(error.message));
      throw error;
    }
    return {
      id: data,
      videoCount: imported.videos.length,
      truncated: imported.truncated,
      message: imported.truncated
        ? `İlk ${formatCount(YOUTUBE_MAX_VIDEOS, "video")} alındı (liste daha uzun).`
        : `${formatCount(imported.videos.length, "video")} alındı.`,
    };
  },
});

/** Elle liste (YouTube bağlantısı olmadan). */
export const createManualPlaylist = createAction({
  name: "createManualPlaylist",
  schema: createPlaylistSchema,
  roles: ["student", "coach", "owner"],
  revalidate: PATHS,
  handler: async (input, ctx) => {
    const { data, error } = await ctx.supabase.rpc("create_playlist", {
      p_playlist: {
        template_id: input.templateId,
        subject_id: input.subjectId,
        title: input.title,
      },
      p_videos: [],
      p_assign_self: ctx.profile.role === "student",
    });
    if (error) {
      if (error.code === "42501") throw new ActionError(NOT_ALLOWED);
      if (error.code === "22023") throw new ActionError(rpcMessage(error.message));
      throw error;
    }
    return { id: data };
  },
});

/** "Listeyi yenile": YouTube'dan yeniden okur, upsert (konu korunur, çıkan kalır; D4). */
export const refreshPlaylist = createAction({
  name: "refreshPlaylist",
  schema: playlistIdSchema,
  roles: ["student", "coach", "owner"],
  revalidate: PATHS,
  handler: async (input, ctx) => {
    const { data: playlist, error: readError } = await ctx.supabase
      .from("video_playlists")
      .select("youtube_playlist_id")
      .eq("id", input.id)
      .maybeSingle();
    if (readError) throw readError;
    if (!playlist) throw new ActionError(NOT_FOUND);
    if (!playlist.youtube_playlist_id)
      throw new ActionError("Bu liste elle kuruldu; YouTube bağlantısı yok.");
    let imported;
    try {
      imported = await fetchPlaylist(playlist.youtube_playlist_id);
    } catch (error) {
      throw new ActionError(youtubeErrorMessage(error));
    }
    const { data, error } = await ctx.supabase.rpc("import_playlist_videos", {
      p_playlist_id: input.id,
      p_videos: imported.videos.map((v) => ({
        youtube_video_id: v.youtubeVideoId,
        title: v.title,
        duration_seconds: v.durationSeconds,
        sort_order: v.sortOrder,
      })),
    });
    if (error) {
      if (error.code === "42501") throw new ActionError(NOT_ALLOWED);
      throw error;
    }
    const result = (data as { inserted?: number; updated?: number } | null) ?? {};
    return {
      inserted: result.inserted ?? 0,
      updated: result.updated ?? 0,
      message: `${formatCount(result.inserted ?? 0, "yeni video")}, ${formatCount(result.updated ?? 0, "güncellenen")}.`,
    };
  },
});

export const updatePlaylist = createAction({
  name: "updatePlaylist",
  schema: updatePlaylistSchema,
  roles: ["student", "coach", "owner"],
  revalidate: PATHS,
  handler: async (input, ctx) => {
    const { data, error } = await ctx.supabase
      .from("video_playlists")
      .update({ title: input.title, channel_name: input.channelName, subject_id: input.subjectId })
      .eq("id", input.id)
      .select("id");
    if (error) {
      if (error.code === "42501") throw new ActionError(NOT_ALLOWED);
      throw error;
    }
    if (data.length === 0) throw new ActionError(NOT_FOUND);
    return { id: input.id };
  },
});

/** Listeyi sil: videolar ve izleme satırları cascade; plan görevleri kalır (video_id boşalır). */
export const deletePlaylist = createAction({
  name: "deletePlaylist",
  schema: playlistIdSchema,
  roles: ["student", "coach", "owner"],
  revalidate: PATHS,
  handler: async (input, ctx) => {
    const { data, error } = await ctx.supabase
      .from("video_playlists")
      .delete()
      .eq("id", input.id)
      .select("id");
    if (error) {
      if (error.code === "42501") throw new ActionError(NOT_ALLOWED);
      throw error;
    }
    if (data.length === 0) throw new ActionError(NOT_FOUND);
    return { id: input.id };
  },
});

/** "Katalogda tut": öğrencinin özel listesi kurum kataloğuna geçer. */
export const keepPlaylistInCatalog = createAction({
  name: "keepPlaylistInCatalog",
  schema: playlistIdSchema,
  roles: ["coach", "owner"],
  revalidate: PATHS,
  handler: async (input, ctx) => {
    const { data, error } = await ctx.supabase
      .from("video_playlists")
      .update({ student_id: null })
      .eq("id", input.id)
      .select("id");
    if (error) {
      if (error.code === "42501") throw new ActionError(NOT_ALLOWED);
      if (error.code === "23505")
        throw new ActionError("Aynı YouTube listesi katalogda zaten var.");
      throw error;
    }
    if (data.length === 0) throw new ActionError(NOT_FOUND);
    return { id: input.id };
  },
});

/**
 * Tek video ekle (bağlantıyla): anahtar varsa başlık/süre YouTube'dan, yoksa başlık zorunlu.
 * `import_playlist_videos` tek satır (upsert; aynı video varsa başlık güncellenir).
 */
export const addVideo = createAction({
  name: "addVideo",
  schema: addVideoSchema,
  roles: ["student", "coach", "owner"],
  revalidate: PATHS,
  handler: async (input, ctx) => {
    const parsed = parseYoutubeUrl(input.url);
    if (!parsed || parsed.kind !== "video")
      throw new ActionError("Bağlantı bir YouTube videosu değil.");
    const playlist = await playlistSubject(ctx.supabase, input.playlistId);
    await assertTopic(ctx.supabase, input.topicId, playlist);
    let title = input.title;
    let durationSeconds: number | null = null;
    if (hasYoutubeApiKey()) {
      try {
        const info = await fetchVideo(parsed.id);
        title = title ?? info.title;
        durationSeconds = info.durationSeconds;
      } catch (error) {
        // Anahtar var ama erişilemedi: başlık verildiyse elle devam, yoksa hata.
        if (!title || (error instanceof YoutubeError && error.code === "not_found")) {
          throw new ActionError(youtubeErrorMessage(error));
        }
      }
    }
    if (!title) throw new ActionError("YouTube anahtarı tanımlı değil; video başlığını yaz.");
    const { count, error: countError } = await ctx.supabase
      .from("videos")
      .select("id", { count: "exact", head: true })
      .eq("playlist_id", input.playlistId);
    if (countError) throw countError;
    const { error } = await ctx.supabase.rpc("import_playlist_videos", {
      p_playlist_id: input.playlistId,
      p_videos: [
        {
          youtube_video_id: parsed.id,
          title,
          duration_seconds: durationSeconds,
          sort_order: count ?? 0,
        },
      ],
    });
    if (error) {
      if (error.code === "42501") throw new ActionError(NOT_ALLOWED);
      if (error.code === "22023") throw new ActionError(rpcMessage(error.message));
      throw error;
    }
    if (input.topicId) {
      const { error: topicError } = await ctx.supabase
        .from("videos")
        .update({ topic_id: input.topicId })
        .eq("playlist_id", input.playlistId)
        .eq("youtube_video_id", parsed.id);
      if (topicError) throw topicError;
    }
    return { youtubeVideoId: parsed.id, title };
  },
});

export const updateVideo = createAction({
  name: "updateVideo",
  schema: updateVideoSchema,
  roles: ["student", "coach", "owner"],
  revalidate: PATHS,
  handler: async (input, ctx) => {
    const playlist = await playlistSubject(ctx.supabase, input.playlistId);
    await assertTopic(ctx.supabase, input.topicId, playlist);
    const { data, error } = await ctx.supabase
      .from("videos")
      .update({
        title: input.title,
        topic_id: input.topicId,
        duration_seconds: input.durationMinutes === null ? null : input.durationMinutes * 60,
      })
      .eq("id", input.id)
      .eq("playlist_id", input.playlistId)
      .select("id");
    if (error) {
      if (error.code === "42501") throw new ActionError(NOT_ALLOWED);
      throw error;
    }
    if (data.length === 0) throw new ActionError("Video bulunamadı; sayfayı yenile.");
    return { id: input.id };
  },
});

export const deleteVideo = createAction({
  name: "deleteVideo",
  schema: videoIdSchema,
  roles: ["student", "coach", "owner"],
  revalidate: PATHS,
  handler: async (input, ctx) => {
    const { data, error } = await ctx.supabase
      .from("videos")
      .delete()
      .eq("id", input.id)
      .eq("playlist_id", input.playlistId)
      .select("id");
    if (error) throw error;
    if (data.length === 0) throw new ActionError("Video bulunamadı; sayfayı yenile.");
    return { id: input.id };
  },
});

/** Seçili videoları konuya eşle (tek UPDATE). */
export const setVideoTopics = createAction({
  name: "setVideoTopics",
  schema: setVideoTopicsSchema,
  roles: ["student", "coach", "owner"],
  revalidate: PATHS,
  handler: async (input, ctx) => {
    const playlist = await playlistSubject(ctx.supabase, input.playlistId);
    await assertTopic(ctx.supabase, input.topicId, playlist);
    const { data, error } = await ctx.supabase
      .from("videos")
      .update({ topic_id: input.topicId })
      .eq("playlist_id", input.playlistId)
      .in("id", input.videoIds)
      .select("id");
    if (error) {
      if (error.code === "42501") throw new ActionError(NOT_ALLOWED);
      throw error;
    }
    return { updated: data.length };
  },
});

/** Koç: birden fazla öğrenciye tek insert. */
export const assignPlaylist = createAction({
  name: "assignPlaylist",
  schema: assignPlaylistSchema,
  roles: ["coach", "owner"],
  revalidate: PATHS,
  handler: async (input, ctx) => {
    const { data: existing, error: existingError } = await ctx.supabase
      .from("student_playlists")
      .select("student_id")
      .eq("playlist_id", input.playlistId)
      .in("student_id", input.studentIds);
    if (existingError) throw existingError;
    const done = new Set(existing.map((e) => e.student_id));
    const rows = input.studentIds
      .filter((id) => !done.has(id))
      .map((id) => ({ student_id: id, playlist_id: input.playlistId, assigned_by: ctx.userId }));
    if (rows.length === 0) return { assigned: 0, message: "Seçilen öğrencilere zaten atanmış." };
    const { error } = await ctx.supabase.from("student_playlists").insert(rows);
    if (error) {
      if (error.code === "42501") throw new ActionError(NOT_ALLOWED);
      throw error;
    }
    return { assigned: rows.length, message: `${formatCount(rows.length, "öğrenciye")} atandı.` };
  },
});

export const unassignPlaylist = createAction({
  name: "unassignPlaylist",
  schema: unassignPlaylistSchema,
  roles: ["coach", "owner"],
  revalidate: PATHS,
  handler: async (input, ctx) => {
    const { data, error } = await ctx.supabase
      .from("student_playlists")
      .delete()
      .eq("playlist_id", input.playlistId)
      .eq("student_id", input.studentId)
      .select("playlist_id");
    if (error) throw error;
    if (data.length === 0) throw new ActionError("Atama bulunamadı; sayfayı yenile.");
    return { removed: 1 };
  },
});

/** Öğrenci: katalogdaki mevcut listeyi kendine alır. */
export const selfAssignPlaylist = createAction({
  name: "selfAssignPlaylist",
  schema: playlistIdSchema,
  roles: ["student"],
  revalidate: PATHS,
  handler: async (input, ctx) => {
    const { error } = await ctx.supabase
      .from("student_playlists")
      .upsert(
        { student_id: ctx.userId, playlist_id: input.id, assigned_by: ctx.userId },
        { onConflict: "student_id,playlist_id", ignoreDuplicates: true },
      );
    if (error) {
      if (error.code === "42501") throw new ActionError(NOT_ALLOWED);
      throw error;
    }
    return { id: input.id };
  },
});

/** "İzledim" / geri al (RPC: yayınlanmış plandaki açık video görevi de tamamlanır; D6). */
export const markVideoWatched = createAction({
  name: "markVideoWatched",
  schema: markWatchedSchema,
  roles: ["student", "coach", "owner"],
  revalidate: WATCH_PATHS,
  handler: async (input, ctx) => {
    assertOwn(ctx.profile.role, ctx.userId, input.studentId);
    const { data, error } = await ctx.supabase.rpc("mark_video_watched", {
      p_video_id: input.videoId,
      p_watched: input.watched,
      p_student_id: input.studentId,
    });
    if (error) {
      if (error.code === "42501") throw new ActionError(NOT_ALLOWED);
      throw error;
    }
    const completed = (data as { completed_items?: number } | null)?.completed_items ?? 0;
    return { watched: input.watched, completedItems: completed };
  },
});

/** Video notu (tek tablo upsert; izleme işareti korunur). */
export const setVideoNote = createAction({
  name: "setVideoNote",
  schema: videoNoteSchema,
  roles: ["student", "coach", "owner"],
  revalidate: PATHS,
  handler: async (input, ctx) => {
    assertOwn(ctx.profile.role, ctx.userId, input.studentId);
    const { error } = await ctx.supabase
      .from("student_video_progress")
      .upsert(
        { student_id: input.studentId, video_id: input.videoId, note: input.note },
        { onConflict: "student_id,video_id" },
      );
    if (error) {
      if (error.code === "42501") throw new ActionError(NOT_ALLOWED);
      throw error;
    }
    return { note: input.note };
  },
});
