import type { Metadata } from "next";
import Link from "next/link";
import { LayoutGridIcon } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { WeakTopics, getTopicAlerts } from "@/features/analytics";
import { TopicLegend, TopicMap, countDone, getTopicMap, percentOf } from "@/features/topics";
import { requireRole } from "@/lib/auth";
import { formatCount, formatPercent } from "@/lib/format";
import { getEnabledModules, requireModule } from "@/modules/get-enabled-modules";

export const metadata: Metadata = { title: "Konular" };

/**
 * K2 Konular sekmesi: haritanın sade sürümü; koç durumu değiştirebilir. Analiz modülü açıksa
 * üstte zayıf konular ve bakım gerektirenler (Faz 4c).
 */
export default async function CoachStudentTopicsPage({
  params,
}: PageProps<"/coach/students/[studentId]/topics">) {
  const { studentId } = await params;
  await requireRole("coach", "owner");
  await requireModule(studentId, "topics");
  const [map, enabled] = await Promise.all([getTopicMap(studentId), getEnabledModules(studentId)]);
  const alerts = enabled.has("analytics") ? await getTopicAlerts(studentId) : null;

  if (!map) {
    return (
      <EmptyState
        icon={LayoutGridIcon}
        title="Konu listesi atanmamış"
        description="Bu öğrenciye bir müfredat şablonu atanmadığı için konu haritası boş."
        action={
          <Button asChild variant="secondary">
            <Link href="/coach/templates">Şablon ata</Link>
          </Button>
        }
      />
    );
  }

  const cells = map.subjects.flatMap((s) => s.topics);
  const done = countDone(cells.map((c) => c.status));

  return (
    <section className="flex flex-col gap-4">
      {alerts ? <WeakTopics alerts={alerts} /> : null}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <p className="text-small text-ink-500">
          {`${map.templateName} · ${done} / ${formatCount(cells.length, "konu")} tamamlandı · ${formatPercent(percentOf(done, cells.length))}`}
        </p>
        <TopicLegend />
      </div>
      <TopicMap map={map} studentId={studentId} audience="coach" />
    </section>
  );
}
