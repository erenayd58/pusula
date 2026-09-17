import type { Metadata } from "next";
import { ClockIcon, FlameIcon, HourglassIcon } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { Badge } from "@/components/ui/badge";
import { getStudentHeader } from "@/features/core";
import { getStreak } from "@/features/question-log";
import { requireRole } from "@/lib/auth";
import { daysUntil, greetingFor } from "@/lib/dates";
import { formatCount, formatDateTr } from "@/lib/format";
import { getEnabledModules } from "@/modules/get-enabled-modules";
import { getStudentTodayWidgets } from "@/modules/widgets";

export const metadata: Metadata = { title: "Bugün" };

/**
 * S1/S5 Bugün: selamlama, tarih, seri ve LGS geri sayımı; ardından açık modüllerin panel
 * kartları (registry `widgets`). Masaüstünde iki sütun (main: hedef + kayıtlar; side: hafta +
 * konular), içerik en fazla 1240 px (layout). Plan ve tekrar kartları ilgili fazlarda gelir.
 */
export default async function TodayPage() {
  const { userId, profile } = await requireRole("student");
  const [student, enabled] = await Promise.all([
    getStudentHeader(userId),
    getEnabledModules(userId),
  ]);
  const streak = enabled.has("question-log") ? await getStreak(userId) : 0;
  const widgets = getStudentTodayWidgets(enabled);
  const main = widgets.filter((w) => w.column === "main");
  const side = widgets.filter((w) => w.column === "side");
  const now = new Date();
  const firstName = profile.full_name.split(" ")[0] ?? profile.full_name;
  const days = student?.examDate ? daysUntil(student.examDate, now) : null;

  return (
    <>
      <header className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <span
            aria-hidden="true"
            className="flex size-12 items-center justify-center rounded-md clay-sm text-heading font-semibold text-ink-900"
          >
            {firstName.charAt(0).toLocaleUpperCase("tr-TR")}
          </span>
          <div className="flex flex-col">
            <h1 className="text-title font-semibold tracking-tight lg:text-title-lg">
              {`${greetingFor(now)} ${firstName}`}
            </h1>
            <p className="text-small text-ink-500">{formatDateTr(now, { weekday: true })}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {streak > 0 ? (
            <Badge aria-label={`Seri: ${formatCount(streak, "gün")} üst üste kayıt`}>
              <FlameIcon aria-hidden="true" />
              {formatCount(streak, "gün")}
            </Badge>
          ) : null}
          {days !== null && days >= 0 ? (
            <Badge>
              <ClockIcon aria-hidden="true" />
              {days === 0 ? "LGS bugün" : `LGS'ye ${formatCount(days, "gün")}`}
            </Badge>
          ) : null}
        </div>
      </header>

      {widgets.length > 0 ? (
        <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
          <div className="flex flex-col gap-4">
            {main.map(({ key, component: Widget }) => (
              <Widget key={key} studentId={userId} />
            ))}
          </div>
          <div className="flex flex-col gap-4">
            {side.map(({ key, component: Widget }) => (
              <Widget key={key} studentId={userId} />
            ))}
          </div>
        </div>
      ) : (
        <EmptyState
          icon={HourglassIcon}
          title="Bugün ekranında gösterilecek bir şey yok"
          description="Koçun modülleri açınca günün hedefi ve kayıtların burada görünecek."
        />
      )}
    </>
  );
}
