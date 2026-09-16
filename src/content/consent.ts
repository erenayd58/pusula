import { CONSENT_DOCUMENT_VERSION } from "@/config/constants";

/**
 * KVKK aydınlatma metni ve açık rıza beyanı (01-proje-plani Bölüm 9). TASLAK: hukuki inceleme
 * yapılmadan üretimde kullanılmaz. Metin değişince `CONSENT_DOCUMENT_VERSION` de artırılır;
 * eski onaylar eski sürümle kayıtlı kalır.
 */
export const consentDocument = {
  version: CONSENT_DOCUMENT_VERSION,
  draftLabel: "TASLAK — hukuki inceleme gerekli",
  title: "Kişisel verilerin işlenmesine ilişkin aydınlatma metni",
  sections: [
    {
      heading: "Hangi veriler işlenir?",
      body: "Çocuğunuzun adı, kullanıcı adı, sınıf ve okul bilgisi (isteğe bağlı), çalışma kayıtları (çözülen soru, konu durumu, deneme sonuçları, plan tamamlama), koç notları ve isteğe bağlı olarak yanlış defteri fotoğrafları. T.C. kimlik numarası, adres ve sağlık bilgisi hiçbir zaman istenmez.",
    },
    {
      heading: "Neden işlenir?",
      body: "LGS hazırlık sürecini takip etmek, koçun çalışma planı hazırlamasını ve size haftalık özet sunmasını sağlamak için.",
    },
    {
      heading: "Kimlerle paylaşılır, nerede saklanır?",
      body: "Veriler yalnızca çocuğunuzun koçu, kurum sahibi ve sizinle paylaşılır. Sunucular Avrupa Birliği'nde (Frankfurt) bulunur; bu, verilerin yurt dışına aktarılması anlamına gelir.",
    },
    {
      heading: "Haklarınız",
      body: "Verilere erişme, düzeltme ve silme hakkınız vardır. Öğrenci hesabı silindiğinde tüm bağlı veriler ve fotoğraflar kalıcı olarak silinir. Rızanızı istediğiniz zaman kurumla iletişime geçerek geri çekebilirsiniz.",
    },
  ],
  explicitConsentStatement:
    "Aydınlatma metnini okudum. Çocuğumun yukarıda belirtilen kişisel verilerinin, belirtilen amaçlarla ve yurt dışına aktarım dahil olmak üzere işlenmesine açık rıza veriyorum.",
} as const;
