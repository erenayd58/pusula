import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ComingSoon } from "@/components/shared/coming-soon";
import { requireRole } from "@/lib/auth";
import { requireModule } from "@/modules/get-enabled-modules";
import { findModuleBySegment } from "@/modules/registry";

/**
 * Veli sekmelerinin yer tutucusu (Denemeler, Notlar): segment registry'de bir modüle karşılık
 * gelmeli ve modül çocuk için açık olmalı; yoksa 404.
 */
function resolve(tab: string) {
  const mod = findModuleBySegment("parent", tab);
  if (!mod) return null;
  const item = mod.nav?.parent?.find((t) => t.segment === tab);
  return { mod, label: item?.label ?? mod.name, icon: item?.icon ?? mod.icon };
}

export async function generateMetadata({
  params,
}: PageProps<"/parent/[studentId]/[tab]">): Promise<Metadata> {
  const { tab } = await params;
  return { title: resolve(tab)?.label };
}

export default async function ParentTabPage({ params }: PageProps<"/parent/[studentId]/[tab]">) {
  const { studentId, tab } = await params;
  const resolved = resolve(tab);
  if (!resolved) notFound();
  await requireRole("parent");
  await requireModule(studentId, resolved.mod.id);

  return (
    <ComingSoon name={resolved.label} description={resolved.mod.description} icon={resolved.icon} />
  );
}
