import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ComingSoon } from "@/components/shared/coming-soon";
import { requireRole } from "@/lib/auth";
import { findModuleByHref } from "@/modules/registry";

/**
 * Koç menüsündeki yer tutucu sayfalar (planlar, şablonlar, kataloglar, duyurular, ayarlar).
 * Koç menüsü öğrenciye bağlı olmadığı için modül filtresi yok; href registry'de yoksa 404.
 */
function resolve(section: string) {
  const href = `/coach/${section}`;
  const mod = findModuleByHref("coach", href);
  if (!mod) return null;
  const item = mod.nav?.coach?.find((i) => i.href === href);
  return { mod, label: item?.label ?? mod.name, icon: item?.icon ?? mod.icon };
}

export async function generateMetadata({
  params,
}: PageProps<"/coach/[section]">): Promise<Metadata> {
  const { section } = await params;
  return { title: resolve(section)?.label };
}

export default async function SectionPage({ params }: PageProps<"/coach/[section]">) {
  const { section } = await params;
  const resolved = resolve(section);
  if (!resolved) notFound();
  await requireRole("coach", "owner");

  return (
    <>
      <h1 className="text-title font-semibold tracking-tight">{resolved.label}</h1>
      <ComingSoon
        name={resolved.label}
        description={resolved.mod.description}
        icon={resolved.icon}
      />
    </>
  );
}
