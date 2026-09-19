import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState } from "@/components/shared/empty-state";
import {
  PlaylistForm,
  getVideoOptions,
  listCatalogTitles,
  listVideoTemplates,
} from "@/features/videos";
import { requireRole } from "@/lib/auth";

export const metadata: Metadata = { title: "Liste ekle" };

/** Koç liste ekleme (flat): şablon `?template=` (yoksa ilk); YouTube bağlantısı ya da elle liste. */
export default async function CoachNewPlaylistPage({
  searchParams,
}: PageProps<"/coach/videos/new">) {
  await requireRole("coach", "owner");
  const { template } = await searchParams;
  const templates = await listVideoTemplates();
  const selected =
    templates.find((t) => t.id === (typeof template === "string" ? template : "")) ??
    templates[0] ??
    null;
  const [options, catalog] = await Promise.all([
    selected ? getVideoOptions(selected.id) : Promise.resolve(null),
    listCatalogTitles(),
  ]);

  return (
    <>
      <header className="flex flex-col gap-1">
        <h1 className="text-title font-semibold tracking-tight">Liste ekle</h1>
        <p className="text-small text-ink-500">
          YouTube listesi bağlantısını yapıştır; videolar başlık, süre ve sırayla gelir. Konuya
          eşleme ve atama kayıttan sonra.
        </p>
        {templates.length > 1 && selected ? (
          <p className="text-small text-ink-700">
            Konu listesi: <strong>{selected.name}</strong>
            {" · "}
            {templates
              .filter((t) => t.id !== selected.id)
              .map((t) => (
                <Link
                  key={t.id}
                  href={`/coach/videos/new?template=${t.id}`}
                  className="underline underline-offset-4"
                >
                  {t.name}
                </Link>
              ))}
          </p>
        ) : null}
      </header>
      {options ? (
        <PlaylistForm
          options={options}
          catalog={catalog}
          audience="coach"
          basePath="/coach/videos"
        />
      ) : (
        <EmptyState title="Şablon yok" description="Önce bir konu listesi (şablon) tanımlanmalı." />
      )}
    </>
  );
}
