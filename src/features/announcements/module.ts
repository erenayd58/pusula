import { BellIcon } from "lucide-react";
import { defineModule } from "@/modules/define-module";

export const announcementsModule = defineModule({
  id: "announcements",
  name: "Duyurular",
  description: "Koçtan tüm öğrencilere veya bir gruba duyuru",
  icon: BellIcon,
  defaultEnabled: true,
  nav: {
    coach: [{ href: "/coach/announcements", order: 70 }],
  },
});
