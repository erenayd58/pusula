import { StickyNoteIcon } from "lucide-react";
import { defineModule } from "@/modules/define-module";

export const coachNotesModule = defineModule({
  id: "coach-notes",
  name: "Notlar",
  description: "Koçun öğrenci ve veliye açık notları, görüşme kayıtları",
  icon: StickyNoteIcon,
  defaultEnabled: true,
  nav: {
    parent: [{ segment: "notes", label: "Notlar", order: 30 }],
  },
  coachStudentTabs: [{ segment: "notes", label: "Notlar", order: 70 }],
});
