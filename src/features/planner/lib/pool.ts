import type { TaskPoolCategory, TaskPoolCategoryId, TaskPoolItem } from "../types";

/**
 * Görev havuzu kategorileri (08 §3.1). Sıra sabittir; her parça kendi kategorisini doldurur:
 * Parça 2 `frequent`, Parça 3 `weak` / `not_started` / `review_due`, Parça 4 `suggestions`.
 * Boş kategoriler de listede kalır (boş metniyle) — koç havuzun yapısını görür.
 */
const CATEGORY_META: { id: TaskPoolCategoryId; title: string; emptyText: string }[] = [
  { id: "suggestions", title: "Öneriler", emptyText: "Öneriler sonraki güncellemeyle geliyor." },
  {
    id: "weak",
    title: "Zayıf konular",
    emptyText: "Konu uyarıları sonraki güncellemeyle geliyor.",
  },
  {
    id: "not_started",
    title: "Hiç başlanmamış",
    emptyText: "Sıradaki konular burada listelenecek.",
  },
  {
    id: "review_due",
    title: "Tekrar zamanı",
    emptyText: "Tekrar zamanı gelen konular burada listelenecek.",
  },
  {
    id: "frequent",
    title: "Sık kullanılan görevler",
    emptyText:
      "Eklediğin görevler burada birikir; sonraki planda tek dokunuşla tekrar kullanırsın.",
  },
];

export function buildTaskPool(
  items: Partial<Record<TaskPoolCategoryId, TaskPoolItem[]>>,
): TaskPoolCategory[] {
  return CATEGORY_META.map((meta) => ({ ...meta, items: items[meta.id] ?? [] }));
}

/** Arama: başlık ve sebep üzerinde, Türkçe küçük harfe duyarsız. */
export function filterPool(categories: TaskPoolCategory[], query: string): TaskPoolCategory[] {
  const q = query.trim().toLocaleLowerCase("tr-TR");
  if (!q) return categories;
  return categories.map((c) => ({
    ...c,
    items: c.items.filter((i) =>
      `${i.title} ${i.reason ?? ""}`.toLocaleLowerCase("tr-TR").includes(q),
    ),
  }));
}
