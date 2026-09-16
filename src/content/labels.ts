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
