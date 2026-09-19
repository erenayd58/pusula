import type { Metadata } from "next";
import Link from "next/link";
import { BookOpenIcon } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import {
  ResourceProgressTable,
  listStudentResources,
  listStudentSections,
} from "@/features/resources";
import { requireRole } from "@/lib/auth";
import { requireModule } from "@/modules/get-enabled-modules";

export const metadata: Metadata = { title: "Kaynaklar" };

/** K2 Kaynaklar sekmesi (flat): atanmış kitaplar + ilerleme, test listesi salt okunur. */
export default async function CoachStudentResourcesPage({
  params,
}: PageProps<"/coach/students/[studentId]/resources">) {
  const { studentId } = await params;
  await requireRole("coach", "owner");
  await requireModule(studentId, "resources");
  const [rows, sections] = await Promise.all([
    listStudentResources(studentId),
    listStudentSections(studentId),
  ]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-small text-ink-500">
          Atanmış kaynaklar ve test ilerlemesi; bitmiş test = o teste bağlı soru kaydı. Atama
          katalogdan yapılır.
        </p>
        <Button variant="secondary" asChild>
          <Link href="/coach/resources">Kataloğu aç</Link>
        </Button>
      </div>
      {rows.length === 0 ? (
        <EmptyState
          icon={BookOpenIcon}
          title="Atanmış kaynak yok"
          description="Katalogdan bir kitap ata; öğrenci testleri işaretledikçe ilerleme burada görünür."
          action={
            <Button asChild>
              <Link href="/coach/resources">Kataloğu aç</Link>
            </Button>
          }
        />
      ) : (
        <ResourceProgressTable rows={rows} sections={sections} />
      )}
    </div>
  );
}
