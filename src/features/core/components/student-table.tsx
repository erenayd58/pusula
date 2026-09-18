import Link from "next/link";
import { ProgressBar } from "@/components/shared/progress-bar";
import { studentStatusLabels } from "@/content/labels";
import { daysUntil } from "@/lib/dates";
import { formatCount, formatDateTr, formatPercent } from "@/lib/format";
import { paceLabel } from "@/lib/strategy/pace";
import type { StudentListRow } from "../server/queries";
import { StudentRowActions } from "./student-row-actions";

/**
 * K1 öğrenci listesi (flat): ≥ md tablo, telefonda kart listesi (aynı veri, aynı eylemler).
 * Kolonlar: öğrenci, son kayıt, bu hafta soru, haftalık hedef (ince çubuk + %), plan uyumu, takvim
 * (Faz 5b: `paceLabel` "−3 konu" / "+2 konu" / "Uyumlu" / "—"), durum, (koç).
 * Satır ve kart `data-testid="student-row"` taşır (e2e her iki yerleşimde aynı seçiciyi kullanır).
 */
export function StudentTable({
  students,
  viewerRole,
  coaches,
}: {
  students: StudentListRow[];
  viewerRole: "coach" | "owner";
  /** Owner için koç seçenekleri (koç ata diyaloğu); koçta boş. */
  coaches: { id: string; fullName: string }[];
}) {
  if (students.length === 0) {
    return (
      <div className="rounded-sm border border-line bg-bg-paper p-6 text-small text-ink-700">
        Henüz öğrenci yok.{" "}
        <Link
          href="/coach/students/new"
          className="font-medium text-ink-900 underline underline-offset-4"
        >
          İlk öğrenciyi ekle
        </Link>
        , kullanıcı adı ve geçici şifreyle giriş yapsın.
      </div>
    );
  }

  return (
    <>
      <ul className="flex flex-col gap-3 md:hidden" aria-label="Öğrenciler">
        {students.map((s) => (
          <li
            key={s.profileId}
            data-testid="student-row"
            className="flex flex-col gap-3 rounded-sm border border-line bg-bg-paper p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 flex-col">
                <Link
                  href={`/coach/students/${s.profileId}`}
                  className="truncate font-medium text-ink-900 underline-offset-4 hover:underline"
                >
                  {s.fullName}
                </Link>
                <span className="font-mono text-micro-lg text-ink-500">{s.username}</span>
              </div>
              <span className="shrink-0 text-micro-lg text-ink-500">
                {studentStatusLabels[s.status]}
                {viewerRole === "owner" && s.coachName ? ` · ${s.coachName}` : ""}
              </span>
            </div>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-small">
              <dt className="text-ink-500">Son kayıt</dt>
              <dd className="text-ink-900">
                <LastLog dateKey={s.lastLogDate} />
              </dd>
              <dt className="text-ink-500">Bu hafta</dt>
              <dd className="text-ink-900">{formatCount(s.weekQuestions, "soru")}</dd>
              <dt className="text-ink-500">Haftalık hedef</dt>
              <dd>
                <WeekGoal row={s} />
              </dd>
              <dt className="text-ink-500">Plan uyumu</dt>
              <dd className="text-ink-900">
                <PlanCompliance row={s} />
              </dd>
              <dt className="text-ink-500">Takvim</dt>
              <dd className="text-ink-900">
                <Pace row={s} />
              </dd>
            </dl>
            <StudentRowActions
              student={{ profileId: s.profileId, fullName: s.fullName, coachId: s.coachId }}
              viewerRole={viewerRole}
              coaches={coaches}
            />
          </li>
        ))}
      </ul>

      <div className="hidden overflow-x-auto rounded-sm border border-line bg-bg-paper md:block">
        <table className="w-full text-small">
          <thead className="text-left text-micro-lg text-ink-500">
            <tr className="border-b border-line">
              <th className="px-4 py-3 font-medium">Öğrenci</th>
              <th className="px-4 py-3 font-medium">Son kayıt</th>
              <th className="px-4 py-3 text-right font-medium">Bu hafta</th>
              <th className="px-4 py-3 font-medium">Haftalık hedef</th>
              <th className="px-4 py-3 text-right font-medium">Plan uyumu</th>
              <th className="px-4 py-3 text-right font-medium">Takvim</th>
              <th className="px-4 py-3 font-medium">Durum</th>
              {viewerRole === "owner" ? <th className="px-4 py-3 font-medium">Koç</th> : null}
              <th className="px-4 py-3 text-right font-medium">Eylemler</th>
            </tr>
          </thead>
          <tbody>
            {students.map((s) => (
              <tr
                key={s.profileId}
                data-testid="student-row"
                className="border-b border-line last:border-b-0"
              >
                <td className="px-4 py-3">
                  <div className="flex flex-col">
                    <Link
                      href={`/coach/students/${s.profileId}`}
                      className="font-medium text-ink-900 underline-offset-4 hover:underline"
                    >
                      {s.fullName}
                    </Link>
                    <span className="font-mono text-micro-lg text-ink-500">{s.username}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-ink-700">
                  <LastLog dateKey={s.lastLogDate} />
                </td>
                <td className="px-4 py-3 text-right text-ink-900">
                  {formatCount(s.weekQuestions)}
                </td>
                <td className="w-44 px-4 py-3">
                  <WeekGoal row={s} />
                </td>
                <td className="px-4 py-3 text-right text-ink-900 tabular-nums">
                  <PlanCompliance row={s} />
                </td>
                <td className="px-4 py-3 text-right text-ink-900 tabular-nums">
                  <Pace row={s} />
                </td>
                <td className="px-4 py-3 text-ink-700">{studentStatusLabels[s.status]}</td>
                {viewerRole === "owner" ? (
                  <td className="px-4 py-3 text-ink-700">{s.coachName ?? "—"}</td>
                ) : null}
                <td className="px-4 py-3">
                  <StudentRowActions
                    student={{ profileId: s.profileId, fullName: s.fullName, coachId: s.coachId }}
                    viewerRole={viewerRole}
                    coaches={coaches}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

/** "bugün" / "dün" / "3 gün önce" / tarih; kayıt yoksa "kayıt yok". Renkle uyarı yok (04 K1 notu). */
function LastLog({ dateKey }: { dateKey: string | null }) {
  if (!dateKey) return <span className="text-ink-500">kayıt yok</span>;
  const ago = -daysUntil(dateKey);
  if (ago <= 0) return <>bugün</>;
  if (ago === 1) return <>dün</>;
  if (ago < 14) return <>{`${ago} gün önce`}</>;
  return <>{formatDateTr(dateKey)}</>;
}

function WeekGoal({ row }: { row: StudentListRow }) {
  if (row.weekGoalPercent === null) return <span className="text-ink-500">hedef yok</span>;
  return (
    <div className="flex items-center gap-2">
      <ProgressBar
        percent={row.weekGoalPercent}
        reached={row.weekGoalPercent >= 100}
        label={`Haftalık hedef ${formatPercent(row.weekGoalPercent)}`}
        className="w-24"
      />
      <span className="text-ink-900">{formatPercent(row.weekGoalPercent)}</span>
    </div>
  );
}

/** Konu takvimi (Faz 5b): gecikmiş/ileride konu sayısı; hedef yoksa "—". Ders rengi yok. */
function Pace({ row }: { row: StudentListRow }) {
  const label = paceLabel({ overdue: row.topicsOverdue, ahead: row.topicsAhead }, row.hasTargets);
  return (
    <span
      data-testid="pace-label"
      className={row.hasTargets ? "text-ink-900" : "text-ink-500"}
      title={
        row.hasTargets
          ? `${formatCount(row.topicsTotal, "konunun")} ${row.topicsDone}'si bitti`
          : "Hedef kurulmadı"
      }
    >
      {label}
    </span>
  );
}

/** Plan uyumu: bugüne kadarki oran öne, hafta geneli ikincil (plan yoksa "—"). */
function PlanCompliance({ row }: { row: StudentListRow }) {
  if (row.planPercentWeek === null && row.planToDatePercentWeek === null) {
    return <span className="text-ink-500">—</span>;
  }
  return (
    <span className="inline-flex flex-col items-end leading-tight md:items-end">
      <span className="font-medium">
        {row.planToDatePercentWeek === null ? "—" : formatPercent(row.planToDatePercentWeek)}
      </span>
      <span className="text-micro-lg text-ink-500">
        {`hafta ${row.planPercentWeek === null ? "—" : formatPercent(row.planPercentWeek)}`}
      </span>
    </span>
  );
}
