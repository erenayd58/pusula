import { z } from "zod";

export const announcementRoleValues = ["student", "parent"] as const;

export const createAnnouncementSchema = z.object({
  title: z.string().trim().min(1, "Başlık gir.").max(80, "Başlık en fazla 80 karakter olabilir."),
  body: z
    .string()
    .trim()
    .min(1, "Duyuru metni gir.")
    .max(1000, "Metin en fazla 1000 karakter olabilir."),
  roles: z
    .array(z.enum(announcementRoleValues))
    .min(1, "En az bir hedef seç: öğrenciler ya da veliler."),
  /** null = tüm (aktif) öğrenciler; dizi = seçilenler (koç yalnızca kendi öğrencileri). */
  studentIds: z.array(z.uuid()).min(1, "En az bir öğrenci seç.").nullable(),
});
export type CreateAnnouncementInput = z.infer<typeof createAnnouncementSchema>;

export const deleteAnnouncementSchema = z.object({ id: z.uuid() });
