import { VideoIcon } from "lucide-react";
import { defineModule } from "@/modules/define-module";

/**
 * Videolar (Faz 7, 11-faz7-kaynaklar.md): YouTube oynatma listesi kataloğu (içe aktarma sunucuda) +
 * öğrencinin özel listeleri, konuya eşleme, atama, uygulama içi oynatıcı (youtube-nocookie) ve
 * "izledim" işareti. Öğrenci menüsü: masaüstü rayı + "Ben" bağlantısı; K2 "Videolar" sekmesi.
 */
export const videosModule = defineModule({
  id: "videos",
  name: "Videolar",
  description: "YouTube oynatma listeleri ve izleme takibi",
  icon: VideoIcon,
  defaultEnabled: true,
  dependsOn: ["topics"],
  nav: {
    student: [{ href: "/student/videos", order: 70 }],
    coach: [{ href: "/coach/videos", order: 50 }],
  },
  coachStudentTabs: [{ segment: "videos", label: "Videolar", order: 75 }],
});
