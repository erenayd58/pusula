import type { Metadata } from "next";
import Link from "next/link";
import { ChartColumnIcon, PlusIcon } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import {
  LastResultCards,
  NetTrendChart,
  ResultCardList,
  ResultList,
  TopMistakeTopics,
  getResultDetail,
  getTopicMarkCounts,
  getTrend,
  listStudentResults,
} from "@/features/mock-exams";
import { requireRole } from "@/lib/auth";
import { requireModule } from "@/modules/get-enabled-modules";

export const metadata: Metadata = { title: "Denemeler" };

const BASE = "/student/exams";
/** Dört ve üzeri genel denemede grafik, altında kart listesi (10 §3.2). */
const CHART_MIN_POINTS = 4;

/**
 * Öğrenci Denemeler (clay): başlık + "Deneme ekle"; son deneme kartı ve ders kartları; trend grafiği
 * (≥ 4 genel deneme) ya da kart listesi; "En çok yanlış yaptığın konular" (ilk 5); tüm denemeler.
 * Sıralama / karşılaştırma yok. Boş durum eylem önerir.
 */
export default async function StudentExamsPage() {
  const { userId } = await requireRole("student");
  await requireModule(userId, "mock-exams");
  const [results, trend, topics] = await Promise.all([
    listStudentResults(userId),
    getTrend(userId),
    getTopicMarkCounts(userId, undefined, 5),
  ]);
  const lastGeneral = results.find((r) => !r.isBranch);
  const lastDetail = lastGeneral ? await getResultDetail(lastGeneral.id) : null;

  return (
    <>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-title font-semibold tracking-tight lg:text-title-lg">Denemeler</h1>
          <p className="text-small text-ink-500">
            Deneme netlerini gir, gelişimini ve en çok yanlış yaptığın konuları gör.
          </p>
        </div>
        <Button asChild>
          <Link href={`${BASE}/new`}>
            <PlusIcon aria-hidden="true" />
            Deneme ekle
          </Link>
        </Button>
      </header>

      {results.length === 0 ? (
        <EmptyState
          icon={ChartColumnIcon}
          title="Henüz deneme eklemedin"
          description="İlk denemeni ekle, net takibin başlasın."
          action={
            <Button asChild>
              <Link href={`${BASE}/new`}>İlk denemeni ekle</Link>
            </Button>
          }
        />
      ) : (
        <>
          {lastDetail ? (
            <LastResultCards result={lastDetail} href={`${BASE}/${lastDetail.id}`} />
          ) : null}

          {trend.points.length > 0 ? (
            <section className="flex flex-col gap-3" aria-labelledby="trend-heading">
              <h2 id="trend-heading" className="text-heading font-semibold text-ink-900">
                Net gelişimin
              </h2>
              {trend.points.length >= CHART_MIN_POINTS ? (
                <div className="rounded-sm border border-line bg-bg-paper p-4 clay:rounded-card clay:border-0 clay:clay-sm clay:bg-bg-raised">
                  <NetTrendChart points={trend.points} subjects={trend.subjects} />
                </div>
              ) : (
                <ResultCardList points={trend.points} />
              )}
            </section>
          ) : null}

          <TopMistakeTopics
            rows={topics}
            title="En çok yanlış yaptığın konular"
            audience="student"
          />

          <section className="flex flex-col gap-3" aria-labelledby="all-results-heading">
            <h2 id="all-results-heading" className="text-heading font-semibold text-ink-900">
              Tüm denemeler
            </h2>
            <ResultList results={results} basePath={BASE} />
          </section>
        </>
      )}
    </>
  );
}
