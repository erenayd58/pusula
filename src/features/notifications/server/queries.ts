import "server-only";

import { cache } from "react";
import { getSessionUser } from "@/lib/auth/get-session-user";
import { createClient } from "@/lib/supabase/server";
import { notificationPrefsSchema, type NotificationPrefs } from "../schemas";
import type { Notification } from "../types";

/** Okunmamış sayısı (zil rozeti); istek başına bir kez. RLS yalnızca kendi satırları. */
export const getUnreadCount = cache(async (): Promise<number> => {
  const supabase = await createClient();
  const { count, error } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .is("read_at", null);
  if (error) throw error;
  return count ?? 0;
});

/** Son bildirimler (yeni önce); öğrenci adı `students ⋈ profiles` (RLS görünür olanlar). */
export async function listNotifications(limit = 50): Promise<Notification[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("notifications")
    .select(
      "id, type, student_id, data, read_at, created_at, student:students!notifications_student_id_fkey(profile:profiles!students_profile_id_fkey(full_name))",
    )
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data.map((r) => ({
    id: r.id,
    type: r.type,
    studentId: r.student_id,
    studentName: r.student?.profile?.full_name ?? null,
    data: r.data,
    readAt: r.read_at,
    createdAt: r.created_at,
  }));
}

/**
 * Kullanıcının tercihleri (`profiles.notification_prefs`; anahtar yoksa açık). Oturum sahibinin
 * profili zaten `getSessionUser` ile okunmuştur (RLS'de başka profiller de görünür; `limit(1)` olmaz).
 */
export async function getNotificationPrefs(): Promise<NotificationPrefs> {
  const session = await getSessionUser();
  const parsed = notificationPrefsSchema.safeParse(session?.profile?.notification_prefs ?? {});
  return parsed.success ? parsed.data : {};
}
