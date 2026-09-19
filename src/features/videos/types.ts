/** Form seçenekleri: şablonun dersleri ve ünite düzeyi konuları (konuya eşleme, ders çipleri). */
export type VideoSubjectOption = {
  subjectId: string;
  name: string;
  shortName: string;
  color: string;
  topics: { topicId: string; name: string }[];
};

export type VideoOptions = {
  templateId: string;
  subjects: VideoSubjectOption[];
  /** Sunucuda YouTube anahtarı var mı (içe aktarma açık mı). */
  canImport: boolean;
};

/** Katalog satırı (koç tablosu ve "Öğrenci ekledi" bölümü). */
export type PlaylistRow = {
  id: string;
  title: string;
  channelName: string | null;
  youtubePlaylistId: string | null;
  templateId: string;
  subjectId: string | null;
  subjectShortName: string | null;
  subjectColor: string | null;
  studentId: string | null;
  studentName: string | null;
  videoCount: number;
  assignedCount: number;
  importedAt: string | null;
};

export type CatalogTitle = {
  id: string;
  title: string;
  channelName: string | null;
  subjectShortName: string | null;
  assigned: boolean;
};

export type Video = {
  id: string;
  playlistId: string;
  youtubeVideoId: string;
  title: string;
  durationSeconds: number | null;
  topicId: string | null;
  topicName: string | null;
  sortOrder: number;
};

export type PlaylistDetail = {
  id: string;
  title: string;
  channelName: string | null;
  youtubePlaylistId: string | null;
  importedAt: string | null;
  templateId: string;
  subjectId: string | null;
  subjectName: string | null;
  subjectShortName: string | null;
  subjectColor: string | null;
  studentId: string | null;
  studentName: string | null;
  videos: Video[];
  assigned: { studentId: string; fullName: string }[];
};

/** Öğrencinin atanmış listesi + ilerleme (`v_student_playlist_progress`). */
export type StudentPlaylistRow = {
  playlistId: string;
  title: string;
  channelName: string | null;
  subjectId: string | null;
  subjectShortName: string | null;
  subjectColor: string | null;
  isOwn: boolean;
  videosTotal: number;
  videosWatched: number;
  minutesTotal: number;
  minutesRemaining: number;
  percent: number | null;
  lastWatchedAt: string | null;
};

/** Oynatıcı listesinde bir video satırı (`v_student_playlist_videos`). */
export type StudentVideoRow = {
  playlistId: string;
  videoId: string;
  youtubeVideoId: string;
  title: string;
  durationSeconds: number | null;
  subjectId: string | null;
  subjectShortName: string | null;
  subjectColor: string | null;
  topicId: string | null;
  topicName: string | null;
  sortOrder: number;
  watchedAt: string | null;
  note: string | null;
  openPlanItemId: string | null;
};

export type StudentPlaylistDetail = {
  playlist: StudentPlaylistRow;
  videos: StudentVideoRow[];
};
