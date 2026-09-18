import { z } from "zod";

export const topicAlertKindValues = [
  "knowledge_gap",
  "low_accuracy",
  "review_due",
  "forgetting_risk",
  "stale",
  "not_started",
  "neglected_subject",
  "behind_school",
] as const;

/** "Şimdi değil": öneri anahtarı (öğrenci × ders × konu × tür); süreyi sunucu hesaplar. */
export const dismissSuggestionSchema = z.object({
  studentId: z.uuid("Öğrenci kimliği geçersiz."),
  subjectId: z.uuid("Ders kimliği geçersiz."),
  topicId: z.uuid("Konu kimliği geçersiz.").nullable(),
  kind: z.enum(topicAlertKindValues, "Öneri türü geçersiz."),
});
export type DismissSuggestionInput = z.infer<typeof dismissSuggestionSchema>;
