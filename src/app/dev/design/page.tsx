import { CompassIcon } from "lucide-react";
import { surfaceLabels } from "@/content/labels";
import {
  BreakpointsSection,
  ClaySection,
  ColorsSection,
  RadiusSection,
  TypographySection,
} from "./_components/foundations";
import { ComponentsSection } from "./_components/showcase";

export const metadata = { title: "Tasarım sistemi" };
// Üretimde 404: src/app/dev/layout.tsx. Dinamik, çünkü statik ön üretim notFound()'ı 200 ile servis ediyor.
export const dynamic = "force-dynamic";

/**
 * Sadece geliştirme ortamında açılır (bkz. ../layout.tsx); üretimde 404.
 * docs/tasarim/tasarim-sistemi.html ile karşılaştırılarak doğrulanır.
 */
export default function DesignSystemPage() {
  return (
    <main className="mx-auto w-full max-w-[var(--content-max)] px-4 pt-12 pb-24 md:px-8">
      <header className="flex flex-wrap items-center justify-between gap-6">
        <div className="flex items-center gap-4.5">
          <div className="grid size-16 place-items-center rounded-lg clay-md">
            <CompassIcon className="size-7.5" aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-display font-semibold tracking-tight lg:text-display-lg">
              Pusula tasarım sistemi
            </h1>
            <p className="mt-1.5 text-body text-ink-500">
              LGS çalışma takip ve koçluk platformu · açık tema · sadece geliştirme ortamı
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="inline-flex min-h-11 items-center rounded-pill clay-sm px-4 text-small font-medium">
            {surfaceLabels.clay}
          </span>
          <span className="inline-flex min-h-11 items-center rounded-pill bg-bg-raised px-4 text-small font-medium shadow-clay-sm">
            {surfaceLabels["clay-calm"]}
          </span>
          <span className="inline-flex min-h-11 items-center rounded-sm border border-line-strong bg-bg-paper px-4 text-small font-medium">
            {surfaceLabels.flat}
          </span>
        </div>
      </header>
      <p className="mt-5 max-w-3xl text-body leading-relaxed text-ink-700">
        Tek ürün, iki yüzey dili. Renk paleti, ders renkleri, Lexend yazı tipi, lucide ikonları ve
        yazım dili her rolde ortaktır; değişen tek şey yüzeyin dokusudur. Öğrenci tarafı kabarık ve
        dokunsal, koç tarafı düz ve yoğundur.
      </p>

      <ColorsSection />
      <ClaySection />
      <RadiusSection />
      <TypographySection />
      <BreakpointsSection />
      <ComponentsSection />
    </main>
  );
}
