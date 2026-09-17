/**
 * Uygulama çapında teknik sabitler (sezon verisi değil). Sürüm sabitleri tek yerde tutulur;
 * metin `src/content` altındadır.
 */

/**
 * Öğrenci sentetik e-posta alanı (`<kullaniciadi>@<alan>`). Seed, yerel env betiği ve uygulama
 * aynı değeri kullanır; bulutta da aynı kalmalı: değişirse mevcut öğrenciler giriş yapamaz.
 */
export const DEFAULT_STUDENT_EMAIL_DOMAIN = "ogrenci.pusula.local";

/** KVKK aydınlatma metni + açık rıza belgesinin sürümü; `consents.document_version`'a yazılır. */
export const CONSENT_DOCUMENT_VERSION = "aydinlatma-v0-taslak";
