/**
 * Sık kullanılan tablo satır tipleri. `database.types.ts` `pnpm db:types` ile üretildikten
 * sonra (Faz 1a) buraya `Tables<"students">` gibi kısayollar eklenir.
 */
export type Role = "owner" | "coach" | "student" | "parent";
