import { notFound } from "next/navigation";
import { z } from "zod";
import { BottomNav } from "@/components/layout/bottom-nav";
import { getStudentHeader } from "@/features/core";
import { requireRole } from "@/lib/auth";
import { weekStart } from "@/lib/dates";
import { formatNamePossessive, formatWeekRange } from "@/lib/format";
import { getEnabledModules } from "@/modules/get-enabled-modules";
import { getModule, getParentNav } from "@/modules/registry";

/**
 * Seçili çocuğun kabuğu: başlıkta çocuğun adı ve bu hafta, altta Özet · Denemeler · Notlar
 * (registry'den, çocuğun açık modüllerine göre). Veli her genişlikte alt menü kullanır.
 * RLS satır vermezse (bağlı olmayan çocuk) 404.
 */
export default async function Layout({ children, params }: LayoutProps<"/parent/[studentId]">) {
  const { studentId } = await params;
  if (!z.uuid().safeParse(studentId).success) notFound();
  await requireRole("parent");

  const student = await getStudentHeader(studentId);
  if (!student) notFound();
  const enabled = await getEnabledModules(studentId);
  const base = `/parent/${studentId}`;
  const items = getParentNav(enabled).map((t) => {
    const mod = getModule(t.moduleId);
    const item = mod?.nav?.parent?.find((p) => p.segment === t.segment);
    return {
      href: t.segment ? `${base}/${t.segment}` : base,
      label: t.label,
      icon: item?.icon ?? mod!.icon,
    };
  });
  const firstName = student.fullName.split(" ")[0] ?? student.fullName;

  return (
    <>
      <header className="flex items-center gap-3">
        <span
          aria-hidden="true"
          className="flex size-12 items-center justify-center rounded-md clay-sm text-heading font-semibold text-ink-900"
        >
          {firstName.charAt(0).toLocaleUpperCase("tr-TR")}
        </span>
        <div className="flex flex-col">
          <h1 className="text-title font-semibold tracking-tight">{`${formatNamePossessive(firstName)} bu haftası`}</h1>
          <p className="text-small text-ink-500">
            {formatWeekRange(weekStart(new Date()), { year: true })}
          </p>
        </div>
      </header>
      {children}
      <BottomNav label="Veli menüsü" items={items} className="lg:flex" />
    </>
  );
}
