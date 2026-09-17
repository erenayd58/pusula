import { formatCount } from "@/lib/format";

/** Kayıt sonrası toast (04 §10, §12): kalan dili; hedef yoksa yalnızca "Kaydedildi.". */
export function saveToastMessage(status: { todayTotal: number; dailyTarget: number | null }) {
  if (status.dailyTarget === null) return "Kaydedildi.";
  const remaining = status.dailyTarget - status.todayTotal;
  return remaining > 0
    ? `Kaydedildi. Bugün ${formatCount(remaining, "soru")} kaldı.`
    : "Kaydedildi. Günlük hedef tamam!";
}
