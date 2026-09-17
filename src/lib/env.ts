/**
 * Ortam değişkenleri tek yerden okunur (02-mimari Bölüm 9). NEXT_PUBLIC_* değerleri
 * istemciye derlenir; diğerleri yalnızca sunucuda okunur. Eksik değer açık bir hata verir
 * ki yanlış yapılandırma sessizce boş dizeyle ilerlemesin.
 */
import { DEFAULT_STUDENT_EMAIL_DOMAIN } from "@/config/constants";

function required(name: string, value: string | undefined): string {
  if (!value) throw new Error(`Ortam değişkeni eksik: ${name}`);
  return value;
}

/** Tarayıcıya da derlenen değerler; `process.env.NEXT_PUBLIC_…` doğrudan yazılmalı. */
export const publicEnv = {
  get supabaseUrl() {
    return required("NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL);
  },
  get supabasePublishableKey() {
    return required(
      "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    );
  },
  get siteUrl() {
    return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  },
};

/** Yalnızca sunucu. İstemci bileşeninden çağrılırsa değerler tanımsız olur ve hata verir. */
export const serverEnv = {
  get supabaseSecretKey() {
    return required("SUPABASE_SECRET_KEY", process.env.SUPABASE_SECRET_KEY);
  },
  get studentEmailDomain() {
    return process.env.STUDENT_EMAIL_DOMAIN || DEFAULT_STUDENT_EMAIL_DOMAIN;
  },
};
