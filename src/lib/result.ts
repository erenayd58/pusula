/**
 * Server Action dönüş tipi (02-mimari Bölüm 4.2). Formlar `ok` alanına göre dallanır;
 * `error` kullanıcıya gösterilen Türkçe mesajdır, `fieldErrors` alan bazlı zod hatalarıdır.
 */
export type Result<T> =
  { ok: true; data: T } | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

export function ok<T>(data: T): Result<T> {
  return { ok: true, data };
}

export function fail<T = never>(error: string, fieldErrors?: Record<string, string[]>): Result<T> {
  return fieldErrors ? { ok: false, error, fieldErrors } : { ok: false, error };
}
