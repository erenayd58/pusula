import { ActivityIcon } from "lucide-react";
import { defineModule } from "@/modules/define-module";

/**
 * Analiz: konu uyarıları (Parça 3) ve öneri motoru (Parça 4). Menü ve sekmesi yok; koç
 * ana ekranındaki "Dikkat gerektirenler", Konular sekmesindeki zayıf konular ve öğrencinin
 * Bugün kartı bu modülü temsil eder. Konu ve soru verisine dayanır.
 */
export const analyticsModule = defineModule({
  id: "analytics",
  name: "Analiz",
  description: "Konu uyarıları, zayıf konular ve plan önerileri",
  icon: ActivityIcon,
  defaultEnabled: true,
  dependsOn: ["topics", "question-log"],
});
