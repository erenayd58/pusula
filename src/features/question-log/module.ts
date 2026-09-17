import { PencilLineIcon } from "lucide-react";
import { defineModule } from "@/modules/define-module";

/** Menü öğesi yok: öğrenci tarafında (+) hızlı kayıt düğmesi bu modülü temsil eder. */
export const questionLogModule = defineModule({
  id: "question-log",
  name: "Soru Takibi",
  description: "Günlük çözülen soruların ders ve konu bazında kaydı",
  icon: PencilLineIcon,
  defaultEnabled: true,
  dependsOn: ["topics"],
  coachStudentTabs: [{ segment: "questions", label: "Sorular", order: 30 }],
});
