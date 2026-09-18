import { dayOfWeekShortLabels } from "@/content/labels";
import { formatDateTr, formatDuration } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { DayAvailability } from "../lib/availability";
import { minutesToTime } from "../lib/availability";

/**
 * Haftanın 7 günü için müsait süre özeti: gün, tarih, kalan süre ve meşguliyet etiketleri.
 * Program sayfasında ve (Parça 2) plan oluşturucu gün başlıklarında kullanılır. Sunucu bileşeni;
 * renk bilgi taşımaz, tüm gün meşguliyet metinle söylenir.
 */
export function AvailabilitySummary({
  days,
  wake,
  className,
}: {
  days: DayAvailability[];
  /** Kurum uyanık aralığı (SS:DD); açıklama satırında gösterilir. */
  wake: { start: string; end: string };
  className?: string;
}) {
  const total = days.reduce((sum, d) => sum + d.availableMinutes, 0);
  return (
    <section
      aria-labelledby="availability-heading"
      className={cn("flex flex-col gap-3", className)}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="availability-heading" className="text-heading font-semibold text-ink-900">
          Bu hafta müsait süre
        </h2>
        <p className="text-small text-ink-500">
          {`Toplam ${formatDuration(total)} · uyanık aralık ${wake.start} – ${wake.end}`}
        </p>
      </div>
      <ul className="grid gap-2 md:grid-cols-7">
        {days.map((d) => (
          <li
            key={d.date}
            className="flex flex-col gap-1 rounded-sm border border-line bg-bg-paper px-3 py-2 clay:rounded-md clay:border-0 clay:clay-sm"
          >
            <span className="flex items-baseline justify-between gap-2 md:flex-col md:items-start md:gap-0">
              <span className="text-small font-semibold text-ink-900">
                {dayOfWeekShortLabels[d.dayOfWeek]}
              </span>
              <span className="text-micro-lg text-ink-500">{formatDateTr(d.date)}</span>
            </span>
            <span className="text-body font-semibold text-ink-900 tabular-nums">
              {d.allDayBusy ? "Tüm gün meşgul" : formatDuration(d.availableMinutes)}
            </span>
            {d.busy.length > 0 ? (
              <ul className="flex flex-col gap-0.5 text-micro-lg text-ink-700">
                {d.busy.map((b, i) => (
                  <li key={`${b.start}-${b.end}-${i}`} className="tabular-nums">
                    {b.kind === "exception" && b.start === 0 && b.end === 24 * 60
                      ? b.label
                      : `${minutesToTime(b.start)}–${minutesToTime(b.end)} ${b.label}`}
                  </li>
                ))}
              </ul>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
