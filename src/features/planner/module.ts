import { CalendarDaysIcon } from "lucide-react";
import { defineModule } from "@/modules/define-module";

export const plannerModule = defineModule({
  id: "planner",
  name: "Plan",
  description: "Haftalık çalışma planı, görevler ve plan şablonları",
  icon: CalendarDaysIcon,
  defaultEnabled: true,
  dependsOn: ["topics"],
  nav: {
    student: [{ href: "/student/plan", order: 30 }],
    coach: [{ href: "/coach/plans", label: "Planlar", order: 20 }],
  },
  coachStudentTabs: [{ segment: "plan", label: "Plan", order: 40 }],
});
