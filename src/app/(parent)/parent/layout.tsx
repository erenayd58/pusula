import { redirect } from "next/navigation";
import { SurfaceRoot } from "@/components/layout/surface-root";
import { siteConfig } from "@/config/site";
import { LogoutButton, listChildrenNeedingConsent } from "@/features/core";
import { requireRole } from "@/lib/auth";

/**
 * Veli kabuğu (clay-calm, 04 Bölüm 8.3): tek sütun, üstte marka + çıkış. Alt menü çocuğa bağlı
 * olduğu için `[studentId]/layout.tsx` içindedir. requireRole sunucu tarafında kesin kontrol.
 */
export default async function Layout({ children }: LayoutProps<"/parent">) {
  await requireRole("parent");
  // KVKK: onayı tam olmayan çocuk varsa veli paneli açılmaz (01 Bölüm 9; kâğıt onayı da sayılır).
  const pending = await listChildrenNeedingConsent();
  if (pending.length > 0) redirect("/consent");

  return (
    <SurfaceRoot surface="clay-calm">
      <header className="mx-auto flex w-full max-w-[var(--content-max-student)] items-center justify-between gap-4 px-4 pt-4 md:px-8">
        <p className="text-small font-semibold text-ink-900">{siteConfig.name}</p>
        <LogoutButton variant="ghost" />
      </header>
      <main className="mx-auto flex w-full max-w-[var(--content-max-student)] flex-1 flex-col gap-6 px-4 py-6 pb-[calc(var(--nav-bottom)+24px)] md:px-8">
        {children}
      </main>
    </SurfaceRoot>
  );
}
