import { TargetIcon } from "lucide-react";
import { defineModule } from "@/modules/define-module";

/**
 * Hedefler: koç günlük/haftalık soru hedefi atar; öğrenci Bugün'de halkayı görür.
 * Menü öğesi yok; koç formu öğrenci detayı Genel bakış'ta, halka Bugün kartında (widgets.ts).
 */
export const goalsModule = defineModule({
  id: "goals",
  name: "Hedefler",
  description: "Günlük ve haftalık soru hedefi, ilerleme halkası",
  icon: TargetIcon,
  defaultEnabled: true,
  dependsOn: ["question-log"],
});
