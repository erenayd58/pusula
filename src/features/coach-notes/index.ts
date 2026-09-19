/**
 * `coach-notes` modülü dışa açık API'si (Faz 8). İstemci bileşenleri bu dosyayı import etmez
 * (sunucu dosyaları da dışa açılır).
 */
export { coachNotesModule } from "./module";
export { coachNotesWidgets } from "./widgets";
export { NoteForm } from "./components/note-form";
export { NoteList } from "./components/note-list";
export { PinnedNoteCard } from "./components/pinned-note-card";
export { listNotes, getLastParentNote, getPinnedNote } from "./server/queries";
export { createNote, updateNote, deleteNote, togglePin } from "./server/actions";
export {
  createNoteSchema,
  updateNoteSchema,
  deleteNoteSchema,
  pinNoteSchema,
  noteVisibilityValues,
  type CreateNoteInput,
  type UpdateNoteInput,
} from "./schemas";
export type { CoachNote } from "./types";
