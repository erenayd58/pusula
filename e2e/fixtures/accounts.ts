/**
 * Yerel seed hesapları (supabase/seed.sql). Şifre yalnızca yerel Docker ortamı içindir.
 */
export const DEMO_PASSWORD = "pusula-demo";

export const accounts = {
  owner: { identifier: "sahip@pusula.local", home: "/coach" },
  coach: { identifier: "koc@pusula.local", home: "/coach" },
  student: { identifier: "ayse.k", home: "/student" },
  parent: { identifier: "veli.ayse@pusula.local", home: "/parent" },
} as const;

/** Testler arasında çakışmayan kullanıcı adı (a-z0-9 ile, veritabanı kuralına uygun). */
export function uniqueUsername(prefix = "e2e"): string {
  return `${prefix}.${Date.now().toString(36)}${Math.floor(Math.random() * 1e4).toString(36)}`;
}
