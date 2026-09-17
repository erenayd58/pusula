import type { Metadata } from "next";
import { ClockIcon, HourglassIcon } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { Badge } from "@/components/ui/badge";
import { getStudentHeader } from "@/features/core";
import { requireRole } from "@/lib/auth";
import { daysUntil, greetingFor } from "@/lib/dates";
import { formatCount, formatDateTr } from "@/lib/format";
import { getEnabledModules } from "@/modules/get-enabled-modules";
import { getStudentTodayWidgets } from "@/modules/widgets";

export const metadata: Metadata = { title: "Bugün" };

/**
 * S1/S5 Bugün iskeleti: selamlama, tarih, LGS geri sayımı; ardından açık modüllerin panel
 * kartları (registry `widgets`). Hedef, plan ve tekrar kartları Faz 3.
 */
export default async function TodayPage() {
  const { userId, profile } = await requireRole("student");
  const [student, enabled] = await Promise.all([
    getStudentHeader(userId),
    getEnabledModules(userId),
  ]);
  const widgets = getStudentTodayWidgets(enabled);
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
        {days !== null && days >= 0 ? (
          <div className="flex flex-wrap gap-2">
            <Badge>
              <ClockIcon aria-hidden="true" />
              {days === 0 ? "LGS bugün" : `LGS'ye ${formatCount(days, "gün")}`}
            </Badge>
          </div>
        ) : null}
      </header>

      {widgets.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2">
          {widgets.map(({ key, component: Widget }) => (
            <Widget key={key} studentId={userId} />
          ))}
        </div>
      ) : null}

      <EmptyState
        icon={HourglassIcon}
        title="Bugün ekranın hazırlanıyor"
        description="Günün hedefi, planın ve tekrar zamanı gelen konular burada görünecek. Şimdilik menüden bölümlere göz atabilirsin."
      />
    </>
  );
}
