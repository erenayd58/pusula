import { SurfaceRoot } from "@/components/layout/surface-root";
import { siteConfig } from "@/config/site";
import { roleLabels } from "@/content/labels";
import { LogoutButton, listChildrenNeedingConsent } from "@/features/core";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";

/** Veli kabuğu yer tutucu: menü ve registry Faz 1c'de. requireRole sunucu tarafında kesin kontrol. */
export default async function Layout({ children }: LayoutProps<"/parent">) {
  const { profile, userId } = await requireRole("parent");
  // KVKK: açık rızası eksik çocuk varsa veli paneli açılmaz (01-proje-plani Bölüm 9).
  const pending = await listChildrenNeedingConsent(userId);
  if (pending.length > 0) redirect("/consent");
  return (
    <SurfaceRoot surface="clay-calm">
      <header className="mx-auto flex w-full max-w-[var(--content-max)] items-center justify-between gap-4 px-4 pt-4 md:px-8">
        <p className="text-small text-ink-500">
          <span className="font-semibold text-ink-900">{siteConfig.name}</span> ·{" "}
          {roleLabels[profile.role]}
        </p>
        <LogoutButton variant="ghost" />
      </header>
      <main className="mx-auto flex w-full max-w-[var(--content-max)] flex-1 flex-col gap-6 px-4 py-8 md:px-8">
        {children}
      </main>
    </SurfaceRoot>
  );
}
