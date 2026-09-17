import { BookOpenIcon } from "lucide-react";
import { defineModule } from "@/modules/define-module";

export const resourcesModule = defineModule({
  id: "resources",
  name: "Kaynaklar",
  description: "Kitap ve soru bankası kataloğu, öğrenciye atanan kaynaklar",
  icon: BookOpenIcon,
  defaultEnabled: true,
  dependsOn: ["topics"],
  nav: {
    student: [{ href: "/student/resources", order: 60 }],
    coach: [{ href: "/coach/resources", order: 40 }],
  },
});
