"use server";

import { ActionError, createAction } from "@/lib/actions/create-action";
import { createAnnouncementSchema, deleteAnnouncementSchema } from "../schemas";

const PATHS = ["/coach/announcements"] as const;
const COACH = ["coach", "owner"] as const;

/**
 * Duyuru gönder (koç/owner; RLS kendi kurumu + `author_id` kendisi). Bildirimler tetikleyicide
 * dağıtılır (koç yalnızca kendi öğrencilerine; metin bildirime kopyalanır, karar E3). Taslak yok.
 */
export const createAnnouncement = createAction({
  name: "createAnnouncement",
  schema: createAnnouncementSchema,
  roles: COACH,
  revalidate: PATHS,
  handler: async (input, ctx) => {
    const { data, error } = await ctx.supabase
      .from("announcements")
      .insert({
        organization_id: ctx.profile.organization_id,
        author_id: ctx.userId,
        title: input.title,
        body: input.body,
        audience: { roles: input.roles, student_ids: input.studentIds },
      })
      .select("id")
      .single();
    if (error) {
      if (error.code === "42501") throw new ActionError("Bu işlem için yetkin yok.");
      throw error;
    }
    return { id: data.id };
  },
});

/** Duyuruyu siler; gönderilmiş bildirimler kalır (metin kopyalandı). */
export const deleteAnnouncement = createAction({
  name: "deleteAnnouncement",
  schema: deleteAnnouncementSchema,
  roles: COACH,
  revalidate: PATHS,
  handler: async (input, ctx) => {
    const { data, error } = await ctx.supabase
      .from("announcements")
      .delete()
      .eq("id", input.id)
      .select("id");
    if (error) throw error;
    if (data.length === 0) throw new ActionError("Duyuru bulunamadı; sayfayı yenile.");
    return { id: input.id };
  },
});
