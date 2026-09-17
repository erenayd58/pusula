import type { Metadata } from "next";
import { LayoutDashboardIcon } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";

export const metadata: Metadata = { title: "Genel bakış" };

/** K2 Genel bakış: özet kutuları, grafikler ve konu haritası Faz 3 ve sonrasında. */
export default function OverviewPage() {
  return (
    <EmptyState
      icon={LayoutDashboardIcon}
      title="Genel bakış hazırlanıyor"
      description="Bu hafta soru, çalışma süresi, plan uyumu ve son net özetleri Soru Takibi modülüyle birlikte burada görünecek. Şimdilik Modüller sekmesinden öğrencinin göreceği bölümleri ayarlayabilirsiniz."
    />
  );
}
