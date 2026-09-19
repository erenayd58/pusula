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

/** Sabit meşguliyet türü (Faz 4a, haftalık program). */
export const busySlotKindLabels = {
  school: "Okul",
  tutoring_center: "Dershane",
  private_lesson: "Özel ders",
  course: "Kurs",
  other: "Diğer",
} as const;

/** ISO haftanın günü (1 = pazartesi). */
export const dayOfWeekLabels: Record<number, string> = {
  1: "Pazartesi",
  2: "Salı",
  3: "Çarşamba",
  4: "Perşembe",
  5: "Cuma",
  6: "Cumartesi",
  7: "Pazar",
};

export const dayOfWeekShortLabels: Record<number, string> = {
  1: "Pzt",
  2: "Sal",
  3: "Çar",
  4: "Per",
  5: "Cum",
  6: "Cmt",
  7: "Paz",
};

/** Plan durumu (Faz 4b). */
export const planStatusLabels = {
  draft: "Taslak",
  published: "Yayınlandı",
} as const;

/** Plan görev türü (Faz 4b; `section` / `video` Faz 7). */
export const planItemKindLabels = {
  topic_study: "Konu çalışması",
  questions: "Soru",
  review: "Tekrar",
  link: "Bağlantı",
  custom: "Serbest",
  section: "Kaynak testi",
  video: "Video",
} as const;

/** Kaynak (kitap) türü (Faz 7). */
export const resourceTypeLabels = {
  lecture_book: "Konu anlatımı",
  question_bank: "Soru bankası",
  worksheet: "Yaprak test",
  booklet: "Fasikül",
  mock_book: "Deneme kitabı",
  other: "Diğer",
} as const;

/** Kurulum uyarıları (Faz 4 kapanışı; yalnızca koç ekranında). */
export const setupAlertKindLabels = {
  no_schedule: "Haftalık program girilmemiş",
  no_goal: "Aktif hedef yok",
  no_plan: "Bu hafta yayınlanmış plan yok",
  no_logs: "Hiç soru kaydı yok",
} as const;

/** Konu uyarı türü (Faz 4c; öğrenciye yalnızca bakım türleri ve başlanmamış gösterilir, karar A7). */
export const topicAlertKindLabels = {
  knowledge_gap: "Bilgi eksiği",
  low_accuracy: "Düşük başarı",
  review_due: "Tekrar zamanı",
  forgetting_risk: "Unutma riski",
  stale: "Soğumuş konu",
  not_started: "Başlanmamış",
  neglected_subject: "İhmal edilen ders",
  behind_school: "Okulun gerisinde",
  mock_weak: "Denemede tekrarlayan yanlış",
} as const;

/** Yanlış defteri nedeni (Faz 6b, karar C9); `unknown` varsayılan. */
export const mistakeReasonLabels = {
  knowledge_gap: "Bilgi eksiği",
  attention: "Dikkat hatası",
  time: "Süre yetmedi",
  misread_question: "Soru kökünü yanlış okuma",
  calculation: "İşlem hatası",
  unknown: "Bilmiyorum",
} as const;

/** Yanlış defteri durumu (Faz 6b). */
export const mistakeStatusLabels = {
  open: "Açık",
  solved: "Çözüldü",
} as const;

/** Deneme türü (Faz 6a): `subject_id` boş → genel, dolu → branş. */
export const mockExamKindLabels = {
  general: "Genel",
  branch: "Branş",
} as const;
