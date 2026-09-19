import type { Metadata } from "next";
import { CircleXIcon } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import {
  MistakeList,
  ReasonDistribution,
  TopicMistakeList,
  getMistakeOptions,
  getReasonDistribution,
  getTopicMistakeCounts,
  listMistakes,
  parseMistakeFilters,
} from "@/features/mistakes";
import { requireRole } from "@/lib/auth";
import { requireModule } from "@/modules/get-enabled-modules";

export const metadata: Metadata = { title: "Yanlışlar" };

/**
 * K2 Yanlışlar sekmesi (flat): hata nedeni dağılımı + konu bazlı kayıtlar + salt okunur liste
 * (fotoğraf diyaloğu). Koç kayıt açmaz; fotoğraf öğrencinin telefonundan gelir.
 */
export default async function CoachStudentMistakesPage({
  params,
  searchParams,
}: PageProps<"/coach/students/[studentId]/mistakes">) {
  const { studentId } = await params;
  await requireRole("coach", "owner");
  await requireModule(studentId, "mistakes");
  const filters = parseMistakeFilters(await searchParams);
  const base = `/coach/students/${studentId}/mistakes`;
  const [mistakes, options, distribution, topics] = await Promise.all([
    listMistakes(studentId, filters),
    getMistakeOptions(studentId),
    getReasonDistribution(studentId),
    getTopicMistakeCounts(studentId),
  ]);
  const filtered = Boolean(filters.subjectId || filters.status || filters.reason);

  return (
    <div className="flex flex-col gap-6">
      <p className="text-small text-ink-500">
        Öğrencinin yanlış defteri: fotoğraf ya da not, neden ve durum. Kayıtları öğrenci açar;
        burada yalnızca okunur.
      </p>
      {mistakes.length === 0 && !filtered ? (
        <EmptyState
          icon={CircleXIcon}
          title="Henüz defter kaydı yok"
          description="Öğrenci telefonundan yanlış eklediğinde neden dağılımı ve konu listesi burada görünür."
        />
      ) : (
        <>
          <div className="grid gap-4 lg:grid-cols-2">
            <ReasonDistribution distribution={distribution} />
            <TopicMistakeList rows={topics} />
          </div>
          <section className="flex flex-col gap-3" aria-labelledby="mistake-list-heading">
            <h2 id="mistake-list-heading" className="text-heading font-semibold text-ink-900">
              Kayıtlar
            </h2>
            <MistakeList
              mistakes={mistakes}
              subjects={options?.subjects ?? []}
              filters={filters}
              basePath={base}
              audience="coach"
              studentId={studentId}
            />
          </section>
        </>
      )}
    </div>
  );
}
