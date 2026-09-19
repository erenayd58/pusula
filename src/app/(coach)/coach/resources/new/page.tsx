import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState } from "@/components/shared/empty-state";
import {
  ResourceForm,
  getResourceOptions,
  listCatalogTitles,
  listResourceTemplates,
} from "@/features/resources";
import { requireRole } from "@/lib/auth";

export const metadata: Metadata = { title: "Kaynak tanımla" };

/** Koç kaynak tanımlama (flat): şablon `?template=` (yoksa ilk), aynı form. */
export default async function CoachNewResourcePage({
  searchParams,
}: PageProps<"/coach/resources/new">) {
  await requireRole("coach", "owner");
  const { template } = await searchParams;
  const templates = await listResourceTemplates();
  const selected =
    templates.find((t) => t.id === (typeof template === "string" ? template : "")) ??
    templates[0] ??
    null;
  const [options, catalog] = await Promise.all([
    selected ? getResourceOptions(selected.id) : Promise.resolve(null),
    listCatalogTitles(),
  ]);

  return (
    <>
      <header className="flex flex-col gap-1">
        <h1 className="text-title font-semibold tracking-tight">Kaynak tanımla</h1>
        <p className="text-small text-ink-500">
          Kitabı ve testlerini tek hamlede tanımla; konuya eşleme ve atama kayıttan sonra.
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
                  href={`/coach/resources/new?template=${t.id}`}
                  className="underline underline-offset-4"
                >
                  {t.name}
                </Link>
              ))}
          </p>
        ) : null}
      </header>
      {options ? (
        <ResourceForm
          options={options}
          catalog={catalog}
          audience="coach"
          basePath="/coach/resources"
        />
      ) : (
        <EmptyState title="Şablon yok" description="Önce bir konu listesi (şablon) tanımlanmalı." />
      )}
    </>
  );
}
