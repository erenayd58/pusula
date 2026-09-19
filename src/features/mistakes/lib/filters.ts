import { mistakeReasonValues } from "../schemas";
import type { MistakeFilters } from "../types";

/** URL parametrelerinden liste filtresi (`?subject=&status=&reason=`); geçersiz değer yok sayılır. */
export function parseMistakeFilters(
  sp: Record<string, string | string[] | undefined>,
): MistakeFilters {
  const one = (v: string | string[] | undefined) => (typeof v === "string" ? v : undefined);
  const status = one(sp.status);
  const reason = one(sp.reason);
  return {
    subjectId: one(sp.subject),
    status: status === "open" || status === "solved" ? status : undefined,
    reason: mistakeReasonValues.find((r) => r === reason),
  };
}
