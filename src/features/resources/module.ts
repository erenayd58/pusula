import { BookOpenIcon } from "lucide-react";
import { defineModule } from "@/modules/define-module";

/**
 * Kaynaklar (Faz 7, 11-faz7-kaynaklar.md): kurum kitap kataloğu + öğrencinin özel kaynakları,
 * test listesi, atama ve `question_logs.section_id` ile ilerleme. Öğrenci menüsü: masaüstü rayı +
 * "Ben" bağlantısı (04 §8.2); K2 "Kaynaklar" sekmesi.
 */
export const resourcesModule = defineModule({
  id: "resources",
  name: "Kaynaklar",
  description: "Kitap ve soru bankası kataloğu, öğrenciye atanan kaynaklar",
  icon: BookOpenIcon,
  defaultEnabled: true,
  dependsOn: ["topics", "question-log"],
  nav: {
    student: [{ href: "/student/resources", order: 60 }],
    coach: [{ href: "/coach/resources", order: 40 }],
  },
  coachStudentTabs: [{ segment: "resources", label: "Kaynaklar", order: 70 }],
});
