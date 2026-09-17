import type { Metadata } from "next";
import { LayoutGridIcon } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { TopicLegend, TopicMap, countDone, getTopicMap, percentOf } from "@/features/topics";
import { requireRole } from "@/lib/auth";
import { formatCount, formatPercent } from "@/lib/format";
import { requireModule } from "@/modules/get-enabled-modules";

export const metadata: Metadata = { title: "Konular" };

/** S3 / S7 Konu haritası (04 Bölüm 9). Şablon atanmamışsa boş durum. */
export default async function TopicsPage() {
  const { userId } = await requireRole("student");
  await requireModule(userId, "topics");
  const map = await getTopicMap(userId);

  if (!map) {
    return (
      <>
        <h1 className="text-title font-semibold tracking-tight lg:text-title-lg">Konu haritası</h1>
        <EmptyState
          icon={LayoutGridIcon}
          title="Konu listesi atanmamış"
          description="Koçun sana bir konu listesi atadığında dersler ve konular burada görünecek. Koçuna haber verebilirsin."
        />
      </>
    );
  }

  const cells = map.subjects.flatMap((s) => s.topics);
  const done = countDone(cells.map((c) => c.status));

  return (
    <>
      <header className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-title font-semibold tracking-tight lg:text-title-lg">
            Konu haritası
          </h1>
          <p className="text-small text-ink-500">
            {`${done} / ${formatCount(cells.length, "konu")} tamamlandı · ${formatPercent(percentOf(done, cells.length))} · ${formatCount(map.subjects.length, "ders")}`}
          </p>
        </div>
        <TopicLegend />
      </header>
      <TopicMap map={map} studentId={userId} audience="student" />
      <p className="text-small text-ink-500">
        Bir hücreye dokun, detayı açılsın. Masaüstünde ok tuşlarıyla hücreler arasında gezebilirsin.
      </p>
    </>
  );
}
