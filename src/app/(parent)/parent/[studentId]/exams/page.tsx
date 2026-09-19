import type { Metadata } from "next";
import { ChartColumnIcon } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { getStudentHeader } from "@/features/core";
import {
  LastResultCards,
  NetTrendChart,
  ResultCardList,
  ResultList,
  getResultDetail,
  getTrend,
  listStudentResults,
} from "@/features/mock-exams";
import { requireRole } from "@/lib/auth";
import { formatNamePossessive } from "@/lib/format";
import { requireModule } from "@/modules/get-enabled-modules";

export const metadata: Metadata = { title: "Denemeler" };

/** Dört ve üzeri genel denemede grafik, altında kart listesi (10 §3.2). */
const CHART_MIN_POINTS = 4;

/**
 * Veli Denemeler sekmesi (clay-calm; 10 §2 Parça 2): son deneme kartı + ders özeti (son deneme ders
 * netleri + değişim), trend grafiği / kart listesi, deneme listesi (bağlantısız). "Siz" dili,
 * karşılaştırma / sıralama yok, değişim nötr sayı, suçlayıcı dil yok. Salt okunur.
 */
export default async function ParentExamsPage({ params }: PageProps<"/parent/[studentId]/exams">) {
  const { studentId } = await params;
  await requireRole("parent");
  await requireModule(studentId, "mock-exams");
  const [results, trend, student] = await Promise.all([
    listStudentResults(studentId),
    getTrend(studentId),
    getStudentHeader(studentId),
  ]);
  const firstName = student?.fullName.split(" ")[0] ?? "Çocuğunuz";
  const lastGeneral = results.find((r) => !r.isBranch);
  const lastDetail = lastGeneral ? await getResultDetail(lastGeneral.id) : null;

  if (results.length === 0) {
    return (
      <EmptyState
        icon={ChartColumnIcon}
        title="Henüz deneme girilmemiş"
        description={`${firstName} ya da koçu deneme sonucu girdiğinde netler ve gelişim burada görünür.`}
      />
    );
  }

  return (
    <div className="flex flex-col gap-6" data-testid="parent-exams">
      <p className="text-small text-ink-500">
        {`${formatNamePossessive(firstName)} deneme netleri ve ders bazında gelişimi. Netler yayınevi puanı değil; sadece doğru − yanlış hesabıdır.`}
      </p>

      {lastDetail ? <LastResultCards result={lastDetail} /> : null}

      {trend.points.length > 0 ? (
        <section className="flex flex-col gap-3" aria-labelledby="parent-trend-heading">
          <h2 id="parent-trend-heading" className="text-heading font-semibold text-ink-900">
            Net gelişimi
          </h2>
          {trend.points.length >= CHART_MIN_POINTS ? (
            <div className="rounded-card clay-sm bg-bg-raised p-4">
              <NetTrendChart points={trend.points} subjects={trend.subjects} audience="parent" />
            </div>
          ) : (
            <ResultCardList points={trend.points} />
          )}
        </section>
      ) : null}

      <section className="flex flex-col gap-3" aria-labelledby="parent-results-heading">
        <h2 id="parent-results-heading" className="text-heading font-semibold text-ink-900">
          Tüm denemeler
        </h2>
        <ResultList results={results} />
      </section>
    </div>
  );
}
