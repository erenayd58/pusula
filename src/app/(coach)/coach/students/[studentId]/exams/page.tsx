import type { Metadata } from "next";
import Link from "next/link";
import { ChartColumnIcon, PlusIcon } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { getOrgSettings } from "@/features/core";
import {
  LastResultCards,
  NetTrendChart,
  ResultCardList,
  ResultList,
  SubjectProgressTable,
  TopMistakeTopics,
  getResultDetail,
  getSubjectProgress,
  getTopicMarkCounts,
  getTrend,
  listStudentResults,
} from "@/features/mock-exams";
import { requireRole } from "@/lib/auth";
import { requireModule } from "@/modules/get-enabled-modules";

export const metadata: Metadata = { title: "Denemeler" };

const CHART_MIN_POINTS = 4;

/**
 * K2 Denemeler sekmesi (flat): son deneme kartları + trend (≥ 4 genel deneme) / kart listesi +
 * "Ders bazlı net gelişimi" + "Konu bazlı yanlış birikimi" (ilk 10) + liste + "Deneme ekle" +
 * katalog/karşılaştırma bağlantısı.
 */
export default async function CoachStudentExamsPage({
  params,
}: PageProps<"/coach/students/[studentId]/exams">) {
  const { studentId } = await params;
  await requireRole("coach", "owner");
  await requireModule(studentId, "mock-exams");
  const base = `/coach/students/${studentId}/exams`;
  const [results, trend, topics, progress, settings] = await Promise.all([
    listStudentResults(studentId),
    getTrend(studentId),
    getTopicMarkCounts(studentId, undefined, 10),
    getSubjectProgress(studentId),
    getOrgSettings(),
  ]);
  const lastGeneral = results.find((r) => !r.isBranch);
  const lastDetail = lastGeneral ? await getResultDetail(lastGeneral.id) : null;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-small text-ink-500">
          Genel denemelerin toplam neti ve ders bazlı gelişim; branş denemeleri yalnızca listede ve
          ders serisinde.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="secondary">
            <Link href="/coach/exams">Katalog ve karşılaştırma</Link>
          </Button>
          <Button asChild>
            <Link href={`${base}/new`}>
              <PlusIcon aria-hidden="true" />
              Deneme ekle
            </Link>
          </Button>
        </div>
      </div>

      {results.length === 0 ? (
        <EmptyState
          icon={ChartColumnIcon}
          title="Henüz deneme yok"
          description="Öğrenci telefonundan girebilir ya da sonucu buradan sen ekleyebilirsin."
          action={
            <Button asChild variant="secondary">
              <Link href={`${base}/new`}>Deneme ekle</Link>
            </Button>
          }
        />
      ) : (
        <>
          {lastDetail ? (
            <LastResultCards result={lastDetail} href={`${base}/${lastDetail.id}`} />
          ) : null}

          {trend.points.length > 0 ? (
            <section className="flex flex-col gap-3" aria-labelledby="trend-heading">
              <h2 id="trend-heading" className="text-heading font-semibold text-ink-900">
                Net gelişimi
              </h2>
              {trend.points.length >= CHART_MIN_POINTS ? (
                <div className="rounded-sm border border-line bg-bg-paper p-4">
                  <NetTrendChart points={trend.points} subjects={trend.subjects} />
                </div>
              ) : (
                <ResultCardList points={trend.points} />
              )}
            </section>
          ) : null}

          <section className="flex flex-col gap-3" aria-labelledby="progress-heading">
            <h2 id="progress-heading" className="text-heading font-semibold text-ink-900">
              Ders bazlı net gelişimi
            </h2>
            <SubjectProgressTable rows={progress} recentCount={settings.mock_exams.recent_count} />
          </section>

          <TopMistakeTopics rows={topics} title="Konu bazlı yanlış birikimi" audience="coach" />

          <section className="flex flex-col gap-3" aria-labelledby="all-results-heading">
            <h2 id="all-results-heading" className="text-heading font-semibold text-ink-900">
              Tüm denemeler
            </h2>
            <ResultList results={results} basePath={base} />
          </section>
        </>
      )}
    </div>
  );
}
