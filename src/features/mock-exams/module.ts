import { ChartColumnIcon } from "lucide-react";
import { defineModule } from "@/modules/define-module";

export const mockExamsModule = defineModule({
  id: "mock-exams",
  name: "Denemeler",
  description: "Deneme sonuçları, ders bazında netler ve gelişim grafiği",
  icon: ChartColumnIcon,
  defaultEnabled: true,
  dependsOn: ["topics"],
  nav: {
    student: [{ href: "/student/exams", order: 40, mobile: true }],
    coach: [{ href: "/coach/exams", order: 60 }],
    parent: [{ segment: "exams", label: "Denemeler", order: 20 }],
  },
  coachStudentTabs: [{ segment: "exams", label: "Denemeler", order: 50 }],
});
