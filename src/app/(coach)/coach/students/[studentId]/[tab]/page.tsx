import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ComingSoon } from "@/components/shared/coming-soon";
import { requireRole } from "@/lib/auth";
import { requireModule } from "@/modules/get-enabled-modules";
import { findModuleBySegment } from "@/modules/registry";

/**
 * Öğrenci sekmelerinin yer tutucusu: segment registry'de bir modüle karşılık gelmeli ve modül
 * bu öğrenci için açık olmalı; yoksa 404. Gerçek sekme sayfası (ör. `topics/page.tsx`)
 * eklendiğinde bu dinamik segmentin önüne geçer.
 */
function resolve(tab: string) {
  const mod = findModuleBySegment("coachStudentTab", tab);
  if (!mod) return null;
  const item = mod.coachStudentTabs?.find((t) => t.segment === tab);
  return { mod, label: item?.label ?? mod.name, icon: item?.icon ?? mod.icon };
}

export async function generateMetadata({
  params,
}: PageProps<"/coach/students/[studentId]/[tab]">): Promise<Metadata> {
  const { tab } = await params;
  return { title: resolve(tab)?.label };
}

export default async function TabPage({ params }: PageProps<"/coach/students/[studentId]/[tab]">) {
  const { studentId, tab } = await params;
  const resolved = resolve(tab);
  if (!resolved) notFound();
  await requireRole("coach", "owner");
  await requireModule(studentId, resolved.mod.id);

  return (
    <ComingSoon name={resolved.label} description={resolved.mod.description} icon={resolved.icon} />
  );
}
