import "server-only";

import { revalidatePath } from "next/cache";
import type { z } from "zod";
import { getSessionUser } from "@/lib/auth/get-session-user";
import { fail, ok, type Result } from "@/lib/result";
import { createClient, type ServerSupabaseClient } from "@/lib/supabase/server";
import type { Profile, Role } from "@/types";

export type ActionContext = {
  userId: string;
  profile: Profile;
  /** Kullanıcının oturumuyla çalışan istemci; RLS uygulanır. */
  supabase: ServerSupabaseClient;
};

export const ACTION_ERRORS = {
  unauthenticated: "Oturumun bulunamadı. Tekrar giriş yap.",
  forbidden: "Bu işlem için yetkin yok.",
  invalid: "Formda hatalı alanlar var. Kontrol edip tekrar dene.",
  unexpected: "İşlem tamamlanamadı. İnternet bağlantını kontrol edip tekrar dene.",
} as const;

/** Handler'ın kullanıcıya gösterilecek, beklenen bir hatayla bitmesi için. */
export class ActionError extends Error {
  fieldErrors?: Record<string, string[]>;
  constructor(message: string, fieldErrors?: Record<string, string[]>) {
    super(message);
    this.name = "ActionError";
    this.fieldErrors = fieldErrors;
  }
}

/** Next.js `redirect()` / `notFound()` fırlatır; bunlar hata değil, akış kontrolüdür. */
function isNextControlFlow(error: unknown): boolean {
  if (typeof error !== "object" || error === null || !("digest" in error)) return false;
  const digest = (error as { digest: unknown }).digest;
  return (
    typeof digest === "string" &&
    (digest.startsWith("NEXT_REDIRECT") || digest.startsWith("NEXT_HTTP_ERROR_FALLBACK"))
  );
}

/**
 * Server Action sarmalayıcısı (02-mimari Bölüm 4.2): oturum + rol → zod → handler → revalidate.
 * Beklenmeyen hatalar loglanır (öğrenci verisi yazılmaz, sadece eylem adı) ve kullanıcıya
 * genel Türkçe mesaj döner. RLS yine de son savunma hattıdır.
 */
export function createAction<TSchema extends z.ZodType, TOut>(opts: {
  name: string;
  schema: TSchema;
  roles: readonly Role[];
  handler: (input: z.output<TSchema>, ctx: ActionContext) => Promise<TOut>;
  revalidate?: readonly string[];
}) {
  return async (raw: unknown): Promise<Result<TOut>> => {
    const session = await getSessionUser();
    if (!session) return fail(ACTION_ERRORS.unauthenticated);
    if (!session.profile || !opts.roles.includes(session.profile.role)) {
      return fail(ACTION_ERRORS.forbidden);
    }

    const parsed = opts.schema.safeParse(raw);
    if (!parsed.success) {
      return fail(ACTION_ERRORS.invalid, flattenFieldErrors(parsed.error));
    }

    try {
      const supabase = await createClient();
      const data = await opts.handler(parsed.data, {
        userId: session.userId,
        profile: session.profile,
        supabase,
      });
      opts.revalidate?.forEach((path) => revalidatePath(path));
      return ok(data);
    } catch (error) {
      if (isNextControlFlow(error)) throw error;
      if (error instanceof ActionError) return fail(error.message, error.fieldErrors);
      console.error(`[action:${opts.name}] beklenmeyen hata`, error);
      return fail(ACTION_ERRORS.unexpected);
    }
  };
}

/** zod hatasını `{ alan: [mesaj] }` biçimine indirger (iç içe alanlar nokta ile birleşir). */
export function flattenFieldErrors(error: z.ZodError): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = issue.path.length ? issue.path.map(String).join(".") : "_form";
    (out[key] ??= []).push(issue.message);
  }
  return out;
}
