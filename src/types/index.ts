import type { Enums, Tables } from "@/types/database.types";

/**
 * Sık kullanılan tablo satır tipleri. `database.types.ts` elle düzenlenmez (`pnpm db:types`).
 */
export type Role = Enums<"user_role">;
export type Profile = Tables<"profiles">;
export type Student = Tables<"students">;
export type Invitation = Tables<"invitations">;
export type Consent = Tables<"consents">;
export type ParentRelation = Enums<"parent_relation">;
export type ConsentType = Enums<"consent_type">;
