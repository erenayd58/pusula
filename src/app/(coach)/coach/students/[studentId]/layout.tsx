import { notFound } from "next/navigation";
import { ClockIcon } from "lucide-react";
import { z } from "zod";
import { initials } from "@/components/layout/coach-sidebar";
import { TabNav } from "@/components/layout/tab-nav";
import { Badge } from "@/components/ui/badge";
import {
  ConsentBadge,
  InviteParentDialog,
  PaperConsentDialog,
  getConsentStatus,
  getStudentHeader,
} from "@/features/core";
import { requireRole } from "@/lib/auth";
import { daysUntil } from "@/lib/dates";
import { formatCount } from "@/lib/format";
import { getEnabledModules } from "@/modules/get-enabled-modules";
import { getCoachStudentTabs } from "@/modules/registry";

/**
 * K2 Öğrenci detayı başlığı: avatar (tek clay), ad, sınıf/okul, LGS geri sayımı, onay rozeti,
 * eylemler; altında registry'den üretilen sekmeler. RLS satır vermezse 404.
 */
export default async function Layout({
  children,
  params,
}: LayoutProps<"/coach/students/[studentId]">) {
  const { studentId } = await params;
  if (!z.uuid().safeParse(studentId).success) notFound();
  await requireRole("coach", "owner");

  const student = await getStudentHeader(studentId);
  if (!student) notFound();
  const [enabled, consent] = await Promise.all([
    getEnabledModules(studentId),
    getConsentStatus(studentId),
  ]);
  const base = `/coach/students/${studentId}`;
  const tabs = getCoachStudentTabs(enabled).map((t) => ({
    href: t.segment ? `${base}/${t.segment}` : base,
    label: t.label,
    exact: t.segment === "",
  }));
  const days = student.examDate ? daysUntil(student.examDate) : null;
  // class_section şubeyi sınıfla birlikte tutar ("8-A"); yoksa yalnızca sınıf yazılır.
  const meta = [student.classSection ?? `${student.grade}. sınıf`, student.schoolName].filter(
    Boolean,
  );
  const studentRef = { profileId: student.studentId, fullName: student.fullName };

  return (
    <>
      <header className="flex flex-col gap-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <span
              aria-hidden="true"
              className="flex size-12 items-center justify-center rounded-sm clay-sm text-small font-semibold text-ink-900"
            >
              {initials(student.fullName)}
            </span>
            <div className="flex flex-col gap-0.5">
              <h1 className="text-title font-semibold tracking-tight">{student.fullName}</h1>
              <p className="text-small text-ink-500">{meta.join(" · ")}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {days !== null && days >= 0 ? (
              <Badge>
                <ClockIcon aria-hidden="true" />
                {days === 0 ? "LGS bugün" : `LGS'ye ${formatCount(days, "gün")}`}
              </Badge>
            ) : null}
            <ConsentBadge status={consent} />
            <InviteParentDialog student={studentRef} />
            {consent.complete ? null : <PaperConsentDialog student={studentRef} />}
          </div>
        </div>
        <TabNav items={tabs} label="Öğrenci sekmeleri" />
      </header>
      {children}
    </>
  );
}
