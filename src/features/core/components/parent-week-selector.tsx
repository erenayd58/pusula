import Link from "next/link";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { shiftWeek, toDateKey, todayInIstanbul, weekStart } from "@/lib/dates";
import { formatWeekRange } from "@/lib/format";
import { cn } from "@/lib/utils";

const linkClass = (disabled: boolean) =>
  cn(
    "flex size-11 items-center justify-center rounded-md text-ink-700",
    disabled ? "pointer-events-none text-ink-300" : "clay-press clay-sm bg-bg-raised",
  );

/**
 * Veli Özet hafta seçici (12 §2 Adım 6, karar E5): ‹ 14 – 20 Eylül 2026 › ; gelecek hafta yok,
 * bu haftada "Bu hafta" etiketi. Bağlantı `?week=` (pazartesi anahtarı), sunucu bileşeni.
 */
export function ParentWeekSelector({
  basePath,
  weekStartKey,
}: {
  basePath: string;
  weekStartKey: string;
}) {
  const current = toDateKey(weekStart(todayInIstanbul()));
  const isCurrent = weekStartKey >= current;
  const prev = shiftWeek(weekStartKey, -1);
  const next = shiftWeek(weekStartKey, 1);

  return (
    <nav
      aria-label="Hafta seçimi"
      className="flex items-center justify-between gap-3"
      data-testid="parent-week"
    >
      <Link
        href={`${basePath}?week=${prev}`}
        aria-label="Önceki hafta"
        className={linkClass(false)}
      >
        <ChevronLeftIcon aria-hidden="true" className="size-5" />
      </Link>
      <span className="flex flex-col items-center text-center">
        <span className="text-body font-semibold text-ink-900">
          {formatWeekRange(weekStartKey, { year: true })}
        </span>
        <span className="text-micro-lg text-ink-500">
          {isCurrent ? "Bu hafta" : "Geçmiş hafta"}
        </span>
      </span>
      {isCurrent ? (
        <span aria-hidden="true" className={linkClass(true)}>
          <ChevronRightIcon className="size-5" />
        </span>
      ) : (
        <Link
          href={`${basePath}?week=${next}`}
          aria-label="Sonraki hafta"
          className={linkClass(false)}
        >
          <ChevronRightIcon aria-hidden="true" className="size-5" />
        </Link>
      )}
    </nav>
  );
}
