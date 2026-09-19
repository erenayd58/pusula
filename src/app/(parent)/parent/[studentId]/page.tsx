import type { Metadata } from "next";
import { ChartColumnIcon } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { requireRole } from "@/lib/auth";
import { getEnabledModules } from "@/modules/get-enabled-modules";
import { getParentSummaryWidgets } from "@/modules/widgets";

export const metadata: Metadata = { title: "Özet" };

/**
 * Veli Özet (V1): modül kartları registry'den (`parentSummary`, `order` sırasıyla; Faz 6b son deneme
 * neti, Faz 8 plan uyumu / soru / süre / gidişat). Hiç kart yoksa boş durum.
 */
export default async function ParentSummaryPage({ params }: PageProps<"/parent/[studentId]">) {
  const { studentId } = await params;
  await requireRole("parent");
  const enabled = await getEnabledModules(studentId);
  const widgets = getParentSummaryWidgets(enabled);

  if (widgets.length === 0) {
    return (
      <EmptyState
        icon={ChartColumnIcon}
        title="Haftalık özet hazırlanıyor"
        description="Çocuğunuzun plan uyumu, çözdüğü soru sayısı, çalışma süresi ve deneme netleri burada görünecek. Koçunuz kayıtları başlattığında bu ekran dolar."
      />
    );
  }

  return (
    <div className="flex flex-col gap-4" data-testid="parent-summary">
      {widgets.map((w) => {
        const Widget = w.component;
        return <Widget key={w.key} studentId={studentId} />;
      })}
      <p className="text-small text-ink-500">
        Plan uyumu, soru sayısı ve çalışma süresi özeti yakında eklenecek.
      </p>
    </div>
  );
}
