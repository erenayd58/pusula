/**
 * Öğrenci kullanıcı adı ↔ sentetik e-posta dönüşümü (01-proje-plani Bölüm 8, 02 karar #19).
 * Saf fonksiyonlar; alan adı parametre olarak gelir (sunucuda `serverEnv.studentEmailDomain`).
 * Kural veritabanındaki `profiles_username_format` kısıtıyla aynıdır.
 */
export const USERNAME_PATTERN = /^[a-z0-9._]{3,30}$/;

export const USERNAME_RULE_MESSAGE =
  "Kullanıcı adı 3-30 karakter olmalı; sadece küçük İngilizce harf, rakam, nokta ve alt çizgi içerebilir. Türkçe karakter kullanılamaz (ş yerine s, ı yerine i gibi).";

export function isValidUsername(value: string): boolean {
  return USERNAME_PATTERN.test(value);
}

/** Girişte yazılanı karşılaştırılabilir hale getirir: kırp, küçük harf (yalnızca ASCII). */
export function normalizeUsername(value: string): string {
  return value.trim().replace(/[A-Z]/g, (c) => c.toLowerCase());
}

export function usernameToEmail(username: string, domain: string): string {
  return `${username}@${domain}`;
}

export function isStudentEmail(email: string, domain: string): boolean {
  return email.toLowerCase().endsWith(`@${domain.toLowerCase()}`);
}

export function emailToUsername(email: string, domain: string): string | null {
  if (!isStudentEmail(email, domain)) return null;
  return email.slice(0, email.length - domain.length - 1);
}

/** Giriş alanı: `@` içeriyorsa e-posta, değilse kullanıcı adı → sentetik e-posta. */
export function identifierToEmail(identifier: string, domain: string): string {
  const trimmed = identifier.trim();
  if (trimmed.includes("@")) return trimmed.toLowerCase();
  return usernameToEmail(normalizeUsername(trimmed), domain);
}
