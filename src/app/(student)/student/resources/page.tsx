import type { Metadata } from "next";
import Link from "next/link";
import { BookOpenIcon, PlusIcon } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { StudentResourceList, listStudentResources } from "@/features/resources";
import { requireRole } from "@/lib/auth";
import { requireModule } from "@/modules/get-enabled-modules";

export const metadata: Metadata = { title: "Kaynaklarım" };

const BASE = "/student/resources";

/** Öğrenci kaynak listesi (clay): atanmış kitaplar + ilerleme; "+ Kaynak ekle". */
export default async function StudentResourcesPage() {
  const { userId } = await requireRole("student");
  await requireModule(userId, "resources");
  const rows = await listStudentResources(userId);

  return (
    <>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-title font-semibold tracking-tight lg:text-title-lg">Kaynaklarım</h1>
          <p className="text-small text-ink-500">
            Kitaplarındaki testleri işaretle; her test soru kaydın olarak sayılır.
          </p>
        </div>
        <Button asChild>
          <Link href={`${BASE}/new`}>
            <PlusIcon aria-hidden="true" />
            Kaynak ekle
          </Link>
        </Button>
      </header>

      {rows.length === 0 ? (
        <EmptyState
          icon={BookOpenIcon}
          title="Henüz kaynağın yok"
          description="Koçun atadığında burada görünür; istersen kendi kitabını da ekleyebilirsin."
          action={
            <Button asChild>
              <Link href={`${BASE}/new`}>Kitap ekle</Link>
            </Button>
          }
        />
      ) : (
        <StudentResourceList rows={rows} basePath={BASE} />
      )}
    </>
  );
}
