import "server-only";

import { createClient } from "@/lib/supabase/server";
import { createAnnouncementSchema } from "../schemas";
import type { Announcement } from "../types";

const audienceSchema = createAnnouncementSchema.pick({ roles: true }).extend({
  student_ids: createAnnouncementSchema.shape.studentIds.optional(),
});

/** Kurumun duyuruları, yeni önce (RLS: koç/owner kendi kurumu). */
export async function listAnnouncements(): Promise<Announcement[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("announcements")
    .select(
      "id, title, body, audience, created_at, author:profiles!announcements_author_id_fkey(full_name)",
    )
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw error;
  return data.map((r) => {
    const parsed = audienceSchema.safeParse(r.audience);
    return {
      id: r.id,
      title: r.title,
      body: r.body,
      roles: parsed.success ? parsed.data.roles : [],
      studentIds: parsed.success ? (parsed.data.student_ids ?? null) : null,
      authorName: r.author?.full_name ?? null,
      createdAt: r.created_at,
    };
  });
}
