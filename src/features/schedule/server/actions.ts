"use server";

import { ActionError, createAction } from "@/lib/actions/create-action";
import {
  busySlotSchema,
  deleteScheduleRowSchema,
  scheduleExceptionSchema,
  setWakeWindowSchema,
} from "../schemas";

const NOT_ALLOWED = "Bu işlem için yetkin yok.";
const NOT_FOUND = "Kayıt bulunamadı; sayfayı yenile.";
const PATHS = ["/student/schedule", "/student/today", "/coach/students"] as const;
const ROLES = ["student", "coach", "owner"] as const;

/** Öğrenci yalnızca kendi adına yazar; koç/owner için RLS öğrencisiyle sınırlar. */
function assertOwn(role: string, userId: string, studentId: string) {
  if (role === "student" && studentId !== userId) throw new ActionError(NOT_ALLOWED);
}

function rethrow(error: { code?: string }): never {
  if (error.code === "42501") throw new ActionError(NOT_ALLOWED);
  throw error;
}

/** Sabit meşguliyet ekle/güncelle (id varsa güncelleme). */
export const upsertBusySlot = createAction({
  name: "upsertBusySlot",
  schema: busySlotSchema,
  roles: ROLES,
  revalidate: PATHS,
  handler: async (input, ctx) => {
    assertOwn(ctx.profile.role, ctx.userId, input.studentId);
    const values = {
      day_of_week: input.dayOfWeek,
      starts_at: input.startsAt,
      ends_at: input.endsAt,
      kind: input.kind,
      note: input.note,
    };
    if (input.id) {
      const { data, error } = await ctx.supabase
        .from("busy_slots")
        .update(values)
        .eq("id", input.id)
        .eq("student_id", input.studentId)
        .select("id");
      if (error) rethrow(error);
      if (data.length === 0) throw new ActionError(NOT_FOUND);
      return { id: input.id };
    }
    const { data, error } = await ctx.supabase
      .from("busy_slots")
      .insert({ ...values, student_id: input.studentId, created_by: ctx.userId })
      .select("id")
      .single();
    if (error) rethrow(error);
    return { id: data.id };
  },
});

export const deleteBusySlot = createAction({
  name: "deleteBusySlot",
  schema: deleteScheduleRowSchema,
  roles: ROLES,
  revalidate: PATHS,
  handler: async (input, ctx) => {
    assertOwn(ctx.profile.role, ctx.userId, input.studentId);
    const { data, error } = await ctx.supabase
      .from("busy_slots")
      .delete()
      .eq("id", input.id)
      .eq("student_id", input.studentId)
      .select("id");
    if (error) rethrow(error);
    if (data.length === 0) throw new ActionError(NOT_FOUND);
    return { id: input.id };
  },
});

/** Tek seferlik istisna ekle/güncelle; tüm günde saatler boş yazılır. */
export const upsertScheduleException = createAction({
  name: "upsertScheduleException",
  schema: scheduleExceptionSchema,
  roles: ROLES,
  revalidate: PATHS,
  handler: async (input, ctx) => {
    assertOwn(ctx.profile.role, ctx.userId, input.studentId);
    const values = {
      on_date: input.onDate,
      starts_at: input.allDay ? null : input.startsAt,
      ends_at: input.allDay ? null : input.endsAt,
      title: input.title,
      note: input.note,
    };
    if (input.id) {
      const { data, error } = await ctx.supabase
        .from("schedule_exceptions")
        .update(values)
        .eq("id", input.id)
        .eq("student_id", input.studentId)
        .select("id");
      if (error) rethrow(error);
      if (data.length === 0) throw new ActionError(NOT_FOUND);
      return { id: input.id };
    }
    const { data, error } = await ctx.supabase
      .from("schedule_exceptions")
      .insert({ ...values, student_id: input.studentId, created_by: ctx.userId })
      .select("id")
      .single();
    if (error) rethrow(error);
    return { id: data.id };
  },
});

export const deleteScheduleException = createAction({
  name: "deleteScheduleException",
  schema: deleteScheduleRowSchema,
  roles: ROLES,
  revalidate: PATHS,
  handler: async (input, ctx) => {
    assertOwn(ctx.profile.role, ctx.userId, input.studentId);
    const { data, error } = await ctx.supabase
      .from("schedule_exceptions")
      .delete()
      .eq("id", input.id)
      .eq("student_id", input.studentId)
      .select("id");
    if (error) rethrow(error);
    if (data.length === 0) throw new ActionError(NOT_FOUND);
    return { id: input.id };
  },
});

/**
 * Öğrenci uyanık aralığı (Faz 5b, karar B10): koç/owner yazar; ikisi boş → kurum varsayılanına
 * döner. `students.wake_*` kolon grant'ı + RLS (is_coach_of) sınırlar. Program ve plan sayfaları
 * yeniden hesaplanır.
 */
export const setWakeWindow = createAction({
  name: "setWakeWindow",
  schema: setWakeWindowSchema,
  roles: ["coach", "owner"],
  revalidate: [...PATHS, "/coach/plans"],
  handler: async (input, ctx) => {
    const { data, error } = await ctx.supabase
      .from("students")
      .update({ wake_start: input.wakeStart, wake_end: input.wakeEnd })
      .eq("profile_id", input.studentId)
      .select("profile_id");
    if (error) rethrow(error);
    if (data.length === 0) throw new ActionError(NOT_ALLOWED);
    return { wakeStart: input.wakeStart, wakeEnd: input.wakeEnd };
  },
});
