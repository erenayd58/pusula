import type { Metadata } from "next";
import { LayoutGridIcon } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { ResultWizard, getMockOptions } from "@/features/mock-exams";
import { requireRole } from "@/lib/auth";
import { requireModule } from "@/modules/get-enabled-modules";

export const metadata: Metadata = { title: "Deneme ekle" };

/** Öğrenci giriş sihirbazı (3 adım); `?examId=` ile katalogdan ön seçim. */
export default async function NewExamPage({ searchParams }: PageProps<"/student/exams/new">) {
  const { userId } = await requireRole("student");
  await requireModule(userId, "mock-exams");
  const { examId } = await searchParams;
  const options = await getMockOptions(userId);

  return (
    <>
      <header className="flex flex-col gap-1">
        <h1 className="text-title font-semibold tracking-tight lg:text-title-lg">Deneme ekle</h1>
        <p className="text-small text-ink-500">
          Denemeyi seç, ders ders doğru ve yanlışını gir, yanlış yaptığın konuları işaretle.
        </p>
      </header>
      {options ? (
        <ResultWizard
          studentId={userId}
          audience="student"
          options={options}
          initial={null}
          preselectExamId={typeof examId === "string" ? examId : null}
          basePath="/student/exams"
        />
      ) : (
        <EmptyState
          icon={LayoutGridIcon}
          title="Konu listesi atanmamış"
          description="Koçun sana bir konu listesi atadığında deneme girebilirsin. Koçuna haber verebilirsin."
        />
      )}
    </>
  );
}
