import type { Metadata } from "next";
import { ChartColumnIcon } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { ParentWeekSelector } from "@/features/core";
import { requireRole } from "@/lib/auth";
import { resolveWeekParam } from "@/lib/dates";
import { getEnabledModules } from "@/modules/get-enabled-modules";
import { getParentSummaryWidgets } from "@/modules/widgets";

export const metadata: Metadata = { title: "Özet" };

/**
 * Veli Özet (V1; 12 §2 Adım 6): hafta seçici (`?week=`, karar E5) + modül kartları registry'den
 * (`parentSummary`, `order` sırasıyla: plan uyumu, soru/süre, gidişat, son deneme, ders dağılımı,
 * kaynak/video, koç notu). Hiç kart yoksa boş durum; yer tutucu metin yok.
 */
export default async function ParentSummaryPage({
  params,
  searchParams,
}: PageProps<"/parent/[studentId]">) {
  const { studentId } = await params;
  const { week } = await searchParams;
  await requireRole("parent");
  const weekStart = resolveWeekParam(typeof week === "string" ? week : undefined);
  const enabled = await getEnabledModules(studentId);
  const widgets = getParentSummaryWidgets(enabled);

  return (
    <div className="flex flex-col gap-4" data-testid="parent-summary">
      <ParentWeekSelector basePath={`/parent/${studentId}`} weekStartKey={weekStart} />
      {widgets.length === 0 ? (
        <EmptyState
          icon={ChartColumnIcon}
          title="Henüz özet yok"
          description="Çocuğunuzun haftalık gelişimi koçunuz kayıtları başlattığında burada görünür."
        />
      ) : (
        widgets.map((w) => {
          const Widget = w.component;
          return <Widget key={w.key} studentId={studentId} weekStart={weekStart} />;
        })
      )}
    </div>
  );
}
