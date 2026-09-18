import { TargetIcon } from "lucide-react";
import { defineModule } from "@/modules/define-module";

/**
 * Hedefler: koç günlük/haftalık soru hedefi atar; öğrenci Bugün'de halkayı görür. Faz 5b (karar
 * B6): "Hedef" sekmesi — sınava kadar ders başına soru hedefi, konuları bitirme tarihi ve geri
 * planlanmış konu takvimi; konu verisi için `topics`'e bağlıdır. Menü öğesi yok; günlük/haftalık
 * form Genel bakış'ta, halka Bugün kartında (widgets.ts).
 */
export const goalsModule = defineModule({
  id: "goals",
  name: "Hedefler",
  description:
    "Günlük ve haftalık soru hedefi, ilerleme halkası, sınava kadar hedef ve konu takvimi",
  icon: TargetIcon,
  defaultEnabled: true,
  dependsOn: ["question-log", "topics"],
  coachStudentTabs: [{ segment: "target", label: "Hedef", order: 35 }],
});
