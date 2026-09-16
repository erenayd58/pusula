import { z } from "zod";
import { USERNAME_PATTERN, USERNAME_RULE_MESSAGE } from "@/lib/auth/username";

/**
 * Çekirdek modül zod şemaları; form ve Server Action aynı şemayı kullanır (CLAUDE.md "Kod Stili").
 * Mesajlar kullanıcıya görünür: Türkçe.
 */

export const loginSchema = z.object({
  identifier: z.string().trim().min(1, "Kullanıcı adını veya e-postanı yaz."),
  password: z.string().min(1, "Şifreni yaz."),
});
export type LoginInput = z.infer<typeof loginSchema>;

const seasonPattern = /^\d{4}-\d{4}$/;

export const createStudentSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, "Ad soyad en az 2 karakter olmalı.")
    .max(80, "Ad soyad en fazla 80 karakter."),
  username: z.string().trim().regex(USERNAME_PATTERN, USERNAME_RULE_MESSAGE),
  temporaryPassword: z
    .string()
    .min(8, "Geçici şifre en az 8 karakter olmalı.")
    .max(72, "Geçici şifre en fazla 72 karakter."),
  season: z.string().trim().regex(seasonPattern, "Sezon 2026-2027 biçiminde olmalı."),
  examDate: z.iso.date("Sınav tarihi YYYY-AA-GG biçiminde olmalı."),
  /** Sadece owner seçer; koç için boş bırakılır ve kendisi atanır. */
  coachId: z.uuid("Koç seçimi geçersiz.").optional(),
});
export type CreateStudentInput = z.infer<typeof createStudentSchema>;

export const studentIdSchema = z.object({
  studentId: z.uuid("Öğrenci kimliği geçersiz."),
});

export const resetStudentPasswordSchema = studentIdSchema.extend({
  newPassword: z
    .string()
    .min(8, "Yeni şifre en az 8 karakter olmalı.")
    .max(72, "Yeni şifre en fazla 72 karakter."),
});

export const assignCoachSchema = studentIdSchema.extend({
  coachId: z.uuid("Koç seçimi geçersiz."),
});
