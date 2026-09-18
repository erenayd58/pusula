import { CalendarClockIcon } from "lucide-react";
import { defineModule } from "@/modules/define-module";

/**
 * Haftalık program: sabit meşguliyetler ve tek seferlik istisnalar; plan oluşturucunun
 * müsait süre kaynağı. Öğrenci menüsünde öğe yok (karar A11): "Ben" sayfasından ve plan
 * ekranından bağlantıyla açılır; koçta öğrenci sekmesi.
 */
export const scheduleModule = defineModule({
  id: "schedule",
  name: "Program",
  description: "Okul, dershane ve kurs saatleri; yazılı ve gezi gibi istisnalar; müsait süre",
  icon: CalendarClockIcon,
  defaultEnabled: true,
  coachStudentTabs: [{ segment: "schedule", label: "Program", order: 45 }],
});
