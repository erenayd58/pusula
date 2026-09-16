import { SurfaceRoot } from "@/components/layout/surface-root";
import { siteConfig } from "@/config/site";

/**
 * Giriş, davet ve onay ekranları: clay yüzeyi, tek sütun, mobil öncelikli. Tasarım turu
 * henüz yapılmadı (04 Bölüm 14); mevcut bileşenlerle sade kurulum.
 */
export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <SurfaceRoot surface="clay">
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-8 px-4 py-10 md:py-16">
        <div className="flex flex-col gap-1">
          <p className="text-title font-semibold tracking-tight text-ink-900">{siteConfig.name}</p>
          <p className="text-small text-ink-500">{siteConfig.description}</p>
        </div>
        {children}
      </main>
    </SurfaceRoot>
  );
}
