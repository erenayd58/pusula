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
export type TopicStatus = Enums<"topic_status">;
export type CurriculumTemplate = Tables<"curriculum_templates">;
export type Subject = Tables<"subjects">;
export type Topic = Tables<"topics">;
export type BusySlotKind = Enums<"busy_slot_kind">;
export type BusySlot = Tables<"busy_slots">;
export type ScheduleException = Tables<"schedule_exceptions">;
export type PlanStatus = Enums<"plan_status">;
export type PlanItemKind = Enums<"plan_item_kind">;
export type WeeklyPlan = Tables<"weekly_plans">;
export type PlanItemRow = Tables<"plan_items">;
