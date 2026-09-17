import type { Metadata } from "next";
import { ChartColumnIcon } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";

export const metadata: Metadata = { title: "Özet" };

/** V1 Haftalık özet: plan uyumu, soru sayısı, çalışma süresi ve netler Faz 3 ve sonrasında. */
export default function ParentSummaryPage() {
  return (
    <EmptyState
      icon={ChartColumnIcon}
      title="Haftalık özet hazırlanıyor"
      description="Çocuğunuzun plan uyumu, çözdüğü soru sayısı, çalışma süresi ve deneme netleri burada görünecek. Koçunuz kayıtları başlattığında bu ekran dolar."
    />
  );
}
