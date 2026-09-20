/**
 * `videos` modülü dışa açık API'si (Faz 7). İstemci bileşenleri bu dosyayı import etmez (sunucu
 * dosyaları da dışa açılır). Planner ve analytics video verisini görünümlerden okur (11 §0).
 */
export { videosModule } from "./module";
export { videosWidgets } from "./widgets";
export { PlaylistForm } from "./components/playlist-form";
export { VideoEditor } from "./components/video-editor";
export { VideoCatalog } from "./components/video-catalog";
export {
  PlaylistActions,
  AssignPlaylistButton,
  AssignedPlaylistStudents,
} from "./components/playlist-actions";
export { StudentPlaylistList } from "./components/student-playlist-list";
export { StudentPlaylistPlayer } from "./components/student-playlist-player";
export { VideoProgressTable } from "./components/video-progress-table";
export {
  listCatalog,
  listCatalogTitles,
  getVideoOptions,
  listVideoTemplates,
  getStudentTemplateId,
  getPlaylist,
  listStudentsForAssign,
  listStudentPlaylists,
  listStudentVideos,
  getStudentPlaylist,
  resolveWatch,
} from "./server/queries";
export {
  importPlaylist,
  createManualPlaylist,
  refreshPlaylist,
  updatePlaylist,
  deletePlaylist,
  keepPlaylistInCatalog,
  addVideo,
  updateVideo,
  deleteVideo,
  setVideoTopics,
  assignPlaylist,
  unassignPlaylist,
  selfAssignPlaylist,
  markVideoWatched,
  setVideoNote,
} from "./server/actions";
export {
  importPlaylistSchema,
  createPlaylistSchema,
  addVideoSchema,
  markWatchedSchema,
  type ImportPlaylistInput,
  type AddVideoInput,
} from "./schemas";
export type {
  CatalogTitle as PlaylistCatalogTitle,
  PlaylistDetail,
  PlaylistRow,
  StudentPlaylistDetail,
  StudentPlaylistRow,
  StudentVideoRow,
  Video,
  VideoOptions,
  VideoSubjectOption,
} from "./types";
