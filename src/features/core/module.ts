import {
  ChartColumnIcon,
  HouseIcon,
  LayoutDashboardIcon,
  SlidersHorizontalIcon,
  ToggleRightIcon,
  UserIcon,
  UsersIcon,
} from "lucide-react";
import { defineModule } from "@/modules/define-module";

/** Çekirdek: kapatılamaz. Bugün/Ben, Öğrenciler/Ayarlar, Genel bakış/Modüller, Özet. */
export const coreModule = defineModule({
  id: "core",
  name: "Çekirdek",
  description: "Giriş, hesaplar, veli daveti, onaylar ve günlük özet ekranları",
  icon: ChartColumnIcon,
  core: true,
  defaultEnabled: true,
  nav: {
    student: [
      { href: "/student/today", label: "Bugün", icon: HouseIcon, order: 10, mobile: true },
      { href: "/student/profile", label: "Ben", icon: UserIcon, order: 90, mobile: true },
    ],
    coach: [
      { href: "/coach/students", label: "Öğrenciler", icon: UsersIcon, order: 10 },
      { href: "/coach/settings", label: "Ayarlar", icon: SlidersHorizontalIcon, order: 90 },
    ],
    parent: [{ segment: "", label: "Özet", icon: ChartColumnIcon, order: 10 }],
  },
  coachStudentTabs: [
    { segment: "", label: "Genel bakış", icon: LayoutDashboardIcon, order: 10 },
    { segment: "modules", label: "Modüller", icon: ToggleRightIcon, order: 90 },
  ],
});
