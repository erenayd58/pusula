import { CircleXIcon } from "lucide-react";
import { defineModule } from "@/modules/define-module";

export const mistakesModule = defineModule({
  id: "mistakes",
  name: "Yanlışlar",
  description: "Yanlış defteri: fotoğraf, neden ve tekrar takibi",
  icon: CircleXIcon,
  defaultEnabled: true,
  dependsOn: ["topics"],
  nav: {
    student: [{ href: "/student/mistakes", order: 50 }],
    // Veli sekmesi yalnızca `can_view_details` velide (Faz 8, karar E8; C10 kapanır).
    parent: [{ segment: "mistakes", label: "Yanlışlar", order: 40, requiresDetails: true }],
  },
  coachStudentTabs: [{ segment: "mistakes", label: "Yanlışlar", order: 60 }],
});
