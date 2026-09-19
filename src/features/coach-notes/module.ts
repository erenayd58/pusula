import { StickyNoteIcon } from "lucide-react";
import { defineModule } from "@/modules/define-module";

/**
 * Koç notları (Faz 8): koç K2 "Notlar" sekmesinde görünürlük seçerek yazar; öğrenci `/student/notes`
 * (masaüstü rayı + "Ben" bağlantısı, karar E10), veli "Notlar" sekmesi. Görüşme kayıtları kapsam dışı.
 */
export const coachNotesModule = defineModule({
  id: "coach-notes",
  name: "Notlar",
  description: "Koçun öğrenci ve veliye açık notları",
  icon: StickyNoteIcon,
  defaultEnabled: true,
  nav: {
    student: [{ href: "/student/notes", label: "Notlar", order: 60 }],
    parent: [{ segment: "notes", label: "Notlar", order: 30 }],
  },
  coachStudentTabs: [{ segment: "notes", label: "Notlar", order: 70 }],
});
