"use server";

import { z } from "zod";
import { ActionError, createAction } from "@/lib/actions/create-action";
import { markReadSchema, setNotificationPrefsSchema } from "../schemas";

/** Zil sayısı kabukta olduğu için ana sayfalar da tazelenir (12 §4). */
const PATHS = [
  "/student/notifications",
  "/coach/notifications",
  "/parent/notifications",
  "/student/today",
  "/coach/students",
  "/parent",
] as const;
const ALL = ["student", "coach", "owner", "parent"] as const;

/** Tek bildirimi okundu işaretler (RLS: kendi satırı; kolon grant yalnızca read_at). */
export const markRead = createAction({
  name: "markRead",
  schema: markReadSchema,
  roles: ALL,
  revalidate: PATHS,
  handler: async (input, ctx) => {
    const { error } = await ctx.supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("id", input.id)
      .is("read_at", null);
    if (error) throw error;
    return { id: input.id };
  },
});

export const markAllRead = createAction({
  name: "markAllRead",
  schema: z.object({}),
  roles: ALL,
  revalidate: PATHS,
  handler: async (_input, ctx) => {
    const { data, error } = await ctx.supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("recipient_id", ctx.userId)
      .is("read_at", null)
      .select("id");
    if (error) throw error;
    return { count: data.length };
  },
});

/** Tercihler: yalnızca kapalı türler saklanır (`{"weekly_summary": false}`); kendi profili. */
export const setNotificationPrefs = createAction({
  name: "setNotificationPrefs",
  schema: setNotificationPrefsSchema,
  roles: ALL,
  revalidate: PATHS,
  handler: async (input, ctx) => {
    const prefs = Object.fromEntries(Object.entries(input.prefs).filter(([, on]) => on === false));
    const { data, error } = await ctx.supabase
      .from("profiles")
      .update({ notification_prefs: prefs })
      .eq("id", ctx.userId)
      .select("id");
    if (error) {
      if (error.code === "42501") throw new ActionError("Bu işlem için yetkin yok.");
      throw error;
    }
    if (data.length === 0) throw new ActionError("Profil bulunamadı.");
    return { prefs };
  },
});
