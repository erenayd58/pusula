import { VideoIcon } from "lucide-react";
import { defineModule } from "@/modules/define-module";

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
});
