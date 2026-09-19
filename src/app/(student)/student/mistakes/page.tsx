import type { Metadata } from "next";
import Link from "next/link";
import { CircleXIcon, PlusIcon } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import {
  MistakeList,
  getMistakeOptions,
  listMistakes,
  parseMistakeFilters,
} from "@/features/mistakes";
import { requireRole } from "@/lib/auth";
import { requireModule } from "@/modules/get-enabled-modules";

export const metadata: Metadata = { title: "Yanlış defterim" };

const BASE = "/student/mistakes";

/**
 * Öğrenci yanlış defteri (clay): başlık + "Yanlış ekle"; filtre çipleri; kart listesi. Tamamen
 * isteğe bağlı, zorlama yok; boş durum eylem önerir.
 */
export default async function StudentMistakesPage({ searchParams }: PageProps<"/student/mistakes">) {
  const { userId } = await requireRole("student");
  await requireModule(userId, "mistakes");
  const filters = parseMistakeFilters(await searchParams);
  const [mistakes, options] = await Promise.all([
    listMistakes(userId, filters),
    getMistakeOptions(userId),
  ]);
  const filtered = Boolean(filters.subjectId || filters.status || filters.reason);

  return (
    <>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-title font-semibold tracking-tight lg:text-title-lg">Yanlış defterim</h1>
          <p className="text-small text-ink-500">
            Yanlış yaptığın soruları fotoğrafla ya da notla sakla; çözünce işaretle.
          </p>
        </div>
        <Button asChild>
          <Link href={`${BASE}/new`}>
            <PlusIcon aria-hidden="true" />
            Yanlış ekle
          </Link>
        </Button>
      </header>

      {mistakes.length === 0 && !filtered ? (
        <EmptyState
          icon={CircleXIcon}
          title="Defterin boş"
          description="Yanlış yaptığın bir soruyu fotoğrafla ya da kısaca yaz; nedenini işaretlersen koçun sana daha iyi yardım eder."
          action={
            <Button asChild>
              <Link href={`${BASE}/new`}>İlk yanlışını ekle</Link>
            </Button>
          }
        />
      ) : (
        <MistakeList
          mistakes={mistakes}
          subjects={options?.subjects ?? []}
          filters={filters}
          basePath={BASE}
          audience="student"
          studentId={userId}
        />
      )}
    </>
  );
}
