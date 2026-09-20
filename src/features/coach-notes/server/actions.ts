"use server";

import { ActionError, createAction } from "@/lib/actions/create-action";
import { createNoteSchema, deleteNoteSchema, pinNoteSchema, updateNoteSchema } from "../schemas";

/** Not sonrası tazelenen yollar (12 §4); K2 sekmesi dinamik render. */
const PATHS = ["/coach/students", "/student/notes", "/student/profile", "/parent"] as const;
const COACH = ["coach", "owner"] as const;
const NOT_ALLOWED = "Bu işlem için yetkin yok.";
const NOT_FOUND = "Not bulunamadı; sayfayı yenile.";

/** Yeni not (koç/owner; RLS `is_coach_of` + `author_id` kendisi). Görünürlüğe göre bildirim tetikleyicide. */
export const createNote = createAction({
  name: "createNote",
  schema: createNoteSchema,
  roles: COACH,
  revalidate: PATHS,
  handler: async (input, ctx) => {
    const { data, error } = await ctx.supabase
      .from("coach_notes")
      .insert({
        student_id: input.studentId,
        author_id: ctx.userId,
        body: input.body,
        visibility: input.visibility,
        is_pinned: input.isPinned,
      })
      .select("id")
      .single();
    if (error) {
      if (error.code === "42501") throw new ActionError(NOT_ALLOWED);
      throw error;
    }
    return { id: data.id };
  },
});

export const updateNote = createAction({
  name: "updateNote",
  schema: updateNoteSchema,
  roles: COACH,
  revalidate: PATHS,
  handler: async (input, ctx) => {
    const { data, error } = await ctx.supabase
      .from("coach_notes")
      .update({ body: input.body, visibility: input.visibility })
      .eq("id", input.id)
      .eq("student_id", input.studentId)
      .select("id");
    if (error) throw error;
    if (data.length === 0) throw new ActionError(NOT_FOUND);
    return { id: input.id };
  },
});

export const togglePin = createAction({
  name: "togglePin",
  schema: pinNoteSchema,
  roles: COACH,
  revalidate: PATHS,
  handler: async (input, ctx) => {
    const { data, error } = await ctx.supabase
      .from("coach_notes")
      .update({ is_pinned: input.isPinned })
      .eq("id", input.id)
      .eq("student_id", input.studentId)
      .select("id");
    if (error) throw error;
    if (data.length === 0) throw new ActionError(NOT_FOUND);
    return { id: input.id, isPinned: input.isPinned };
  },
});

export const deleteNote = createAction({
  name: "deleteNote",
  schema: deleteNoteSchema,
  roles: COACH,
  revalidate: PATHS,
  handler: async (input, ctx) => {
    const { data, error } = await ctx.supabase
      .from("coach_notes")
      .delete()
      .eq("id", input.id)
      .eq("student_id", input.studentId)
      .select("id");
    if (error) throw error;
    if (data.length === 0) throw new ActionError(NOT_FOUND);
    return { id: input.id };
  },
});
