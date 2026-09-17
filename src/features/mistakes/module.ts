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
  },
  coachStudentTabs: [{ segment: "mistakes", label: "Yanlışlar", order: 60 }],
});
