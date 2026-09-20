import { BellIcon } from "lucide-react";
import { defineModule } from "@/modules/define-module";

/**
 * Bildirimler (Faz 8, karar E4): profil düzeyi; kapatılamaz (`core`), kullanıcı türleri tercihten
 * kapatır. Menü öğesi yok: zil kabuk başlığında, liste `/{rol}/notifications`.
 */
export const notificationsModule = defineModule({
  id: "notifications",
  name: "Bildirimler",
  description:
    "Plan, not, duyuru, tekrar hatırlatması ve haftalık özet bildirimleri; uygulama içi zil",
  icon: BellIcon,
  core: true,
  defaultEnabled: true,
});
