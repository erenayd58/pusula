import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CircleXIcon } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { getParentDetailsAccess, getStudentHeader } from "@/features/core";
import {
  MistakeList,
  getMistakeOptions,
  listMistakes,
  parseMistakeFilters,
} from "@/features/mistakes";
import { requireRole } from "@/lib/auth";
import { formatNamePossessive } from "@/lib/format";
import { requireModule } from "@/modules/get-enabled-modules";

export const metadata: Metadata = { title: "Yanlışlar" };

/**
 * Veli Yanlışlar sekmesi (clay-calm; Faz 8, karar E8 — C10 kapanır): salt okunur liste + filtre
 * çipleri; fotoğraflar imzalı URL (depo politikası `can_read_mistakes` veliyi `can_view_details` ile
 * kapsar). İzin yoksa 404 (sekme de görünmez). "Siz" dili, yargı yok.
 */
export default async function ParentMistakesPage({
  params,
  searchParams,
}: PageProps<"/parent/[studentId]/mistakes">) {
  const { studentId } = await params;
  await requireRole("parent");
  await requireModule(studentId, "mistakes");
  if (!(await getParentDetailsAccess(studentId))) notFound();
  const filters = parseMistakeFilters(await searchParams);
  const base = `/parent/${studentId}/mistakes`;
  const [mistakes, options, student] = await Promise.all([
    listMistakes(studentId, filters),
    getMistakeOptions(studentId),
    getStudentHeader(studentId),
  ]);
  const firstName = student?.fullName.split(" ")[0] ?? "Çocuğunuz";
  const filtered = Boolean(filters.subjectId || filters.status || filters.reason);

  return (
    <section aria-labelledby="mistakes-heading" className="flex flex-col gap-3">
      <h2 id="mistakes-heading" className="text-heading font-semibold text-ink-900">
        {`${formatNamePossessive(firstName)} yanlış defteri`}
      </h2>
      <p className="text-small text-ink-500">
        {`${firstName} yanlış yaptığı soruları burada saklıyor; çözdüklerini işaretliyor. Salt okunur.`}
      </p>
      {mistakes.length === 0 && !filtered ? (
        <EmptyState
          icon={CircleXIcon}
          title="Henüz kayıt yok"
          description={`${firstName} yanlış defterine kayıt eklediğinde burada görünür.`}
        />
      ) : (
        <MistakeList
          mistakes={mistakes}
          subjects={options?.subjects ?? []}
          filters={filters}
          basePath={base}
          audience="parent"
          studentId={studentId}
        />
      )}
    </section>
  );
}
