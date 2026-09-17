/**
 * Enum → Türkçe etiket eşlemelerinin TEK yeri (CLAUDE.md "Kod Stili").
 * Veritabanı enum'ları Faz 1'den itibaren burada etiketlenir; bileşenler etiketi
 * doğrudan yazmaz, buradan okur.
 */
export const roleLabels = {
  owner: "Kurum sahibi",
  coach: "Koç",
  student: "Öğrenci",
  parent: "Veli",
} as const;

export const surfaceLabels = {
  clay: "Öğrenci · clay",
  "clay-calm": "Veli · sakin clay",
  flat: "Koç · sade",
} as const;

export const studentStatusLabels = {
  active: "Aktif",
  paused: "Ara verdi",
  archived: "Arşiv",
} as const;

export const parentRelationLabels = {
  mother: "Anne",
  father: "Baba",
  guardian: "Vasi",
  other: "Diğer",
} as const;

export const consentTypeLabels = {
  privacy_notice: "Aydınlatma metni",
  explicit_consent: "Açık rıza",
  photo_upload: "Fotoğraf yükleme izni",
} as const;

export const consentSourceLabels = {
  parent: "Veli dijital onayı",
  paper: "Kâğıt onayı",
} as const;

/** Konu haritası durumları (04 Bölüm 9). */
export const topicStatusLabels = {
  not_started: "Başlanmadı",
  studying: "Çalışılıyor",
  completed: "Tamamlandı",
  needs_review: "Tekrar gerekli",
  mastered: "Oturdu",
} as const;

/** Soru kaydı kaynağı (Faz 3'te yalnızca `free` kullanılır). */
export const questionSourceLabels = {
  resource: "Kaynak",
  plan: "Plan",
  school: "Okul",
  online: "Çevrim içi",
  free: "Serbest",
} as const;

/** Hedef dönemi. */
export const goalPeriodLabels = {
  daily: "Günlük",
  weekly: "Haftalık",
} as const;
