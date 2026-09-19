import { z } from "zod";

const optionalText = (max: number, label: string) =>
  z
    .string()
    .trim()
    .max(max, `${label} en fazla ${max} karakter olabilir.`)
    .transform((v) => (v === "" ? null : v))
    .nullable();

const url = z.string().trim().min(1, "YouTube bağlantısını yapıştır.").max(500);

/** YouTube liste bağlantısından içe aktarma (koç: katalog; öğrenci: özel + kendine atama). */
export const importPlaylistSchema = z.object({
  templateId: z.uuid("Şablon seçimi geçersiz."),
  url,
  /** null = karışık liste. */
  subjectId: z.uuid("Ders seçimi geçersiz.").nullable(),
});
export type ImportPlaylistInput = z.input<typeof importPlaylistSchema>;

/** Elle kurulan liste (YouTube bağlantısı olmadan; videolar tek tek eklenir). */
export const createPlaylistSchema = z.object({
  templateId: z.uuid("Şablon seçimi geçersiz."),
  title: z
    .string()
    .trim()
    .min(1, "Liste adını yaz.")
    .max(120, "Ad en fazla 120 karakter olabilir."),
  subjectId: z.uuid("Ders seçimi geçersiz.").nullable(),
});
export type CreatePlaylistInput = z.input<typeof createPlaylistSchema>;

export const updatePlaylistSchema = z.object({
  id: z.uuid("Liste kimliği geçersiz."),
  title: z
    .string()
    .trim()
    .min(1, "Liste adını yaz.")
    .max(120, "Ad en fazla 120 karakter olabilir."),
  channelName: optionalText(80, "Kanal"),
  subjectId: z.uuid("Ders seçimi geçersiz.").nullable(),
});
export type UpdatePlaylistInput = z.input<typeof updatePlaylistSchema>;

export const playlistIdSchema = z.object({ id: z.uuid("Liste kimliği geçersiz.") });

/** Tek video ekleme: bağlantı; anahtar yoksa başlık zorunlu (sunucu karar verir). */
export const addVideoSchema = z.object({
  playlistId: z.uuid("Liste kimliği geçersiz."),
  url,
  title: optionalText(200, "Başlık"),
  topicId: z.uuid("Konu seçimi geçersiz.").nullable(),
});
export type AddVideoInput = z.input<typeof addVideoSchema>;

export const updateVideoSchema = z.object({
  id: z.uuid("Video kimliği geçersiz."),
  playlistId: z.uuid("Liste kimliği geçersiz."),
  title: z.string().trim().min(1, "Başlık yaz.").max(200, "Başlık en fazla 200 karakter."),
  topicId: z.uuid("Konu seçimi geçersiz.").nullable(),
  durationMinutes: z
    .number("Sayı gir.")
    .int("Tam sayı gir.")
    .min(1, "En az 1 dakika.")
    .max(600, "En fazla 600 dakika.")
    .nullable(),
});
export type UpdateVideoInput = z.input<typeof updateVideoSchema>;

export const videoIdSchema = z.object({
  id: z.uuid("Video kimliği geçersiz."),
  playlistId: z.uuid("Liste kimliği geçersiz."),
});

/** Seçili videoları konuya eşle (null = kaldır). */
export const setVideoTopicsSchema = z.object({
  playlistId: z.uuid("Liste kimliği geçersiz."),
  videoIds: z.array(z.uuid()).min(1, "En az bir video seç.").max(200),
  topicId: z.uuid("Konu seçimi geçersiz.").nullable(),
});

export const assignPlaylistSchema = z.object({
  playlistId: z.uuid("Liste kimliği geçersiz."),
  studentIds: z.array(z.uuid()).min(1, "En az bir öğrenci seç.").max(100),
});

export const unassignPlaylistSchema = z.object({
  playlistId: z.uuid("Liste kimliği geçersiz."),
  studentId: z.uuid("Öğrenci kimliği geçersiz."),
});

/** "İzledim" / geri al (öğrenci kendi; koç öğrencisi için). */
export const markWatchedSchema = z.object({
  videoId: z.uuid("Video kimliği geçersiz."),
  studentId: z.uuid("Öğrenci kimliği geçersiz."),
  watched: z.boolean(),
});

export const videoNoteSchema = z.object({
  videoId: z.uuid("Video kimliği geçersiz."),
  studentId: z.uuid("Öğrenci kimliği geçersiz."),
  note: optionalText(300, "Not"),
});
