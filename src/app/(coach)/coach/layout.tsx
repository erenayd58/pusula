import { CoachSidebar } from "@/components/layout/coach-sidebar";
import { SurfaceRoot } from "@/components/layout/surface-root";
import { roleLabels } from "@/content/labels";
import { LogoutButton } from "@/features/core";
import { requireRole } from "@/lib/auth";
import { getCoachNav } from "@/modules/registry";

/**
 * Koç kabuğu (flat, 04 Bölüm 8.4): masaüstünde 232 px yan menü, telefonda üst bar + soldan
 * panel. Menü registry'den; koç menüsü öğrenciye bağlı olmadığı için modül filtresi yok.
 * requireRole sunucu tarafında kesin kontrol.
 */
export default async function Layout({ children }: LayoutProps<"/coach">) {
  const { profile } = await requireRole("coach", "owner");
  return (
    <SurfaceRoot surface="flat">
      <CoachSidebar
        items={getCoachNav()}
        user={{ fullName: profile.full_name, subtitle: roleLabels[profile.role] }}
        footer={<LogoutButton variant="ghost" iconOnly />}
      />
      <main className="mx-auto flex w-full max-w-[var(--content-max)] flex-1 flex-col gap-6 px-4 py-6 md:px-8 lg:py-8 lg:pr-8 lg:pl-[calc(var(--coach-sidebar)+2rem)]">
        {children}
      </main>
    </SurfaceRoot>
  );
}
