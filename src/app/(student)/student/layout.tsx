import { SurfaceRoot } from "@/components/layout/surface-root";
import { requireRole } from "@/lib/auth";

/** Öğrenci kabuğu yer tutucu: menü ve registry Faz 1c'de. requireRole sunucu tarafında kesin kontrol. */
export default async function Layout({ children }: LayoutProps<"/student">) {
  await requireRole("student");
  return (
    <SurfaceRoot surface="clay">
      <main className="mx-auto flex w-full max-w-[var(--content-max)] flex-1 flex-col gap-6 px-4 py-8 md:px-8">
        {children}
      </main>
    </SurfaceRoot>
  );
}
