import { z } from "zod";

export const noteVisibilityValues = [
  "coach_only",
  "student",
  "parent",
  "student_and_parent",
] as const;

const body = z
  .string()
  .trim()
  .min(1, "Bir şeyler yaz.")
  .max(1000, "Not en fazla 1000 karakter olabilir.");

export const createNoteSchema = z.object({
  studentId: z.uuid(),
  body,
  visibility: z.enum(noteVisibilityValues),
  isPinned: z.boolean().default(false),
});
export type CreateNoteInput = z.input<typeof createNoteSchema>;

export const updateNoteSchema = z.object({
  id: z.uuid(),
  studentId: z.uuid(),
  body,
  visibility: z.enum(noteVisibilityValues),
});
export type UpdateNoteInput = z.input<typeof updateNoteSchema>;

export const deleteNoteSchema = z.object({ id: z.uuid(), studentId: z.uuid() });

export const pinNoteSchema = z.object({
  id: z.uuid(),
  studentId: z.uuid(),
  isPinned: z.boolean(),
});
