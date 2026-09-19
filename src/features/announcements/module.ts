import { MegaphoneIcon } from "lucide-react";
import { defineModule } from "@/modules/define-module";

/**
 * Duyurular (Faz 8): koç `/coach/announcements` sayfasından öğrencilere ve/veya velilere gönderir;
 * alıcılar bildirim listesinden okur (karar E3). Zil ikonu bildirimlere ait; duyuru megafon.
 */
export const announcementsModule = defineModule({
  id: "announcements",
  name: "Duyurular",
  description: "Koçtan tüm öğrencilere veya bir gruba duyuru",
  icon: MegaphoneIcon,
  defaultEnabled: true,
  nav: {
    coach: [{ href: "/coach/announcements", order: 70 }],
  },
});
