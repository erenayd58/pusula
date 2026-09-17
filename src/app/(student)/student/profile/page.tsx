import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRightIcon, PencilLineIcon } from "lucide-react";
import { LogoutButton, getStudentHeader } from "@/features/core";
import { requireRole } from "@/lib/auth";
import { formatDateTr } from "@/lib/format";
import { getEnabledModules } from "@/modules/get-enabled-modules";

export const metadata: Metadata = { title: "Ben" };

/** Ben: ad, kullanıcı adı, sınav tarihi, kayıt geçmişi bağlantısı ve çıkış (telefonda çıkışın tek yeri). */
export default async function ProfilePage() {
  const { userId, profile } = await requireRole("student");
  const [student, enabled] = await Promise.all([
    getStudentHeader(userId),
    getEnabledModules(userId),
  ]);
  const rows = [
    { label: "Ad soyad", value: profile.full_name },
    { label: "Kullanıcı adı", value: profile.username ?? "—" },
    {
      label: "Sınav tarihi",
      value: student?.examDate ? formatDateTr(student.examDate, { year: true }) : "—",
    },
  ];

  return (
    <>
      <header className="flex items-center gap-3">
        <span
          aria-hidden="true"
          className="flex size-12 items-center justify-center rounded-md clay-sm text-heading font-semibold text-ink-900"
        >
          {profile.full_name.charAt(0).toLocaleUpperCase("tr-TR")}
        </span>
        <div className="flex flex-col">
          <h1 className="text-title font-semibold tracking-tight lg:text-title-lg">Ben</h1>
          <p className="text-small text-ink-500">Hesap bilgilerin</p>
        </div>
      </header>

      <dl className="flex flex-col gap-3 rounded-card clay-md p-4">
        {rows.map((row) => (
          <div key={row.label} className="flex items-baseline justify-between gap-4">
            <dt className="text-small text-ink-500">{row.label}</dt>
            <dd className="text-body font-medium text-ink-900">{row.value}</dd>
          </div>
        ))}
      </dl>

      {enabled.has("question-log") ? (
        <Link
          href="/student/logs"
          className="flex clay-press items-center gap-3 rounded-card clay-md p-4 text-body font-medium text-ink-900"
        >
          <PencilLineIcon aria-hidden="true" className="size-5 text-ink-700" />
          <span className="flex-1">Kayıtlarım</span>
          <ChevronRightIcon aria-hidden="true" className="size-5 text-ink-500" />
        </Link>
      ) : null}

      <div className="flex flex-col gap-2">
        <LogoutButton />
        <p className="text-micro-lg text-ink-500">Şifreni değiştirmek için koçuna söyle.</p>
      </div>
    </>
  );
}
