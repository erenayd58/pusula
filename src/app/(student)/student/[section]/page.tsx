import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ComingSoon } from "@/components/shared/coming-soon";
import { requireRole } from "@/lib/auth";
import { requireModule } from "@/modules/get-enabled-modules";
import { findModuleByHref } from "@/modules/registry";

/**
 * Yer tutucu modül sayfaları: menüdeki href registry'de bir modüle karşılık gelmeli ve modül
 * bu öğrenci için açık olmalı; yoksa 404. Gerçek modül sayfası (ör. `topics/page.tsx`)
 * eklendiğinde bu dinamik segmentin önüne geçer.
 */
function resolve(section: string) {
  const href = `/student/${section}`;
  const mod = findModuleByHref("student", href);
  if (!mod) return null;
  const item = mod.nav?.student?.find((i) => i.href === href);
  return { mod, label: item?.label ?? mod.name, icon: item?.icon ?? mod.icon };
}

export async function generateMetadata({
  params,
}: PageProps<"/student/[section]">): Promise<Metadata> {
  const { section } = await params;
  return { title: resolve(section)?.label };
}

export default async function SectionPage({ params }: PageProps<"/student/[section]">) {
  const { section } = await params;
  const resolved = resolve(section);
  if (!resolved) notFound();
  const { userId } = await requireRole("student");
  await requireModule(userId, resolved.mod.id);

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
