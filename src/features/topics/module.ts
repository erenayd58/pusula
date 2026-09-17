import { LayoutGridIcon } from "lucide-react";
import { defineModule } from "@/modules/define-module";

export const topicsModule = defineModule({
  id: "topics",
  name: "Konular",
  description: "Müfredat şablonu, ders ve konu listesi, konu haritası",
  icon: LayoutGridIcon,
  defaultEnabled: true,
  nav: {
    student: [{ href: "/student/topics", order: 20, mobile: true }],
    coach: [{ href: "/coach/templates", label: "Şablonlar", order: 30 }],
  },
  coachStudentTabs: [{ segment: "topics", label: "Konular", order: 20 }],
});
