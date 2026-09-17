import { BottomNav } from "@/components/layout/bottom-nav";
import { StudentRail } from "@/components/layout/student-rail";
import { SurfaceRoot } from "@/components/layout/surface-root";
import { siteConfig } from "@/config/site";
import { LogoutButton } from "@/features/core";
import { QuickLogButton, QuickLogProvider, getQuickLogOptions } from "@/features/question-log";
import { requireRole } from "@/lib/auth";
import { getEnabledModules } from "@/modules/get-enabled-modules";
import { getStudentNav } from "@/modules/registry";

/**
 * Öğrenci kabuğu (clay, 04 Bölüm 8.2): telefon ve tablette alt menü + ortada hızlı kayıt,
 * masaüstünde 104 px yan ray. Menü öğeleri registry'den, öğrencinin açık modüllerine göre.
 * requireRole sunucu tarafında kesin kontrol. Hızlı kayıt sheet'i `QuickLogProvider` ile
 * kabukta bir kez kurulur; seçenekleri (ders/konu/net kuralı) sunucudan alır.
 */
export default async function Layout({ children }: LayoutProps<"/student">) {
  const { userId } = await requireRole("student");
  const enabled = await getEnabledModules(userId);
  const quickLog = enabled.has("question-log");
  const quickLogOptions = quickLog ? await getQuickLogOptions(userId) : null;

  return (
    <SurfaceRoot surface="clay">
      <QuickLogProvider studentId={userId} options={quickLogOptions}>
        <StudentRail
          items={getStudentNav(enabled)}
          top={quickLog ? <QuickLogButton variant="rail" /> : undefined}
          bottom={<LogoutButton variant="ghost" iconOnly />}
        />
        <div className="flex flex-1 flex-col lg:pl-[var(--nav-rail)]">
          {/* Telefon/tablet üst barı: yalnızca ad; çıkış "Ben" sayfasında (masaüstünde rayda). */}
          <header className="mx-auto flex w-full max-w-[var(--content-max-student)] items-center px-4 pt-4 md:px-8 lg:hidden">
            <p className="text-small font-semibold text-ink-900">{siteConfig.name}</p>
          </header>
          <main className="mx-auto flex w-full max-w-[var(--content-max-student)] flex-1 flex-col gap-6 px-4 py-6 pb-32 md:px-8 lg:py-10">
            {children}
          </main>
        </div>
        <BottomNav
          label="Ana menü"
          items={getStudentNav(enabled, { mobile: true })}
          center={quickLog ? <QuickLogButton variant="fab" /> : undefined}
        />
      </QuickLogProvider>
    </SurfaceRoot>
  );
}
