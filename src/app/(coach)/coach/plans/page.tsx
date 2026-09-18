import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { planStatusLabels } from "@/content/labels";
import { listCoachPlans } from "@/features/planner";
import { requireRole } from "@/lib/auth";
import { resolveWeekParam, shiftWeek } from "@/lib/dates";
import { formatCount, formatPercent, formatWeekRange } from "@/lib/format";

export const metadata: Metadata = { title: "Planlar" };

/** Planlar: öğrenci başına seçili haftanın plan durumu ve uyumu; "Planı aç" oluşturucuya gider. */
export default async function CoachPlansPage({ searchParams }: PageProps<"/coach/plans">) {
  const { week: weekParam } = await searchParams;
  await requireRole("coach", "owner");
  const week = resolveWeekParam(typeof weekParam === "string" ? weekParam : undefined);
  const rows = await listCoachPlans(week);

  return (
    <>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-title font-semibold tracking-tight">Planlar</h1>
          <p className="text-small text-ink-500">Öğrenci başına haftalık plan durumu.</p>
        </div>
        <nav aria-label="Hafta seçici" className="flex items-center gap-1">
          <Button asChild variant="secondary" size="icon" aria-label="Önceki hafta">
            <Link href={`/coach/plans?week=${shiftWeek(week, -1)}`}>
              <ChevronLeftIcon aria-hidden="true" />
            </Link>
          </Button>
          <span className="min-w-[10rem] text-center text-small font-medium text-ink-900">
            {formatWeekRange(week, { year: true })}
          </span>
          <Button asChild variant="secondary" size="icon" aria-label="Sonraki hafta">
            <Link href={`/coach/plans?week=${shiftWeek(week, 1)}`}>
              <ChevronRightIcon aria-hidden="true" />
            </Link>
          </Button>
        </nav>
      </header>

      {rows.length === 0 ? (
        <p className="rounded-sm border border-line bg-bg-paper p-4 text-small text-ink-700">
          Aktif öğrenci yok.
        </p>
      ) : (
        <ul className="flex flex-col divide-y divide-line rounded-sm border border-line bg-bg-paper">
          {rows.map((r) => (
            <li key={r.studentId} className="flex flex-wrap items-center gap-3 px-4 py-3">
              <span className="min-w-[10rem] flex-1 text-small font-medium text-ink-900">
                {r.fullName}
              </span>
              <Badge tone={r.status === "published" ? "success" : "neutral"}>
                {r.status ? planStatusLabels[r.status] : "Plan yok"}
              </Badge>
              <span className="min-w-[12rem] text-small text-ink-700 tabular-nums">
                {r.status
                  ? `${formatCount(r.itemsTotal, "görev")} · ${r.itemsCompleted} tamamlandı${
                      r.status === "published" && r.percent !== null
                        ? ` · ${formatPercent(r.percent)}`
                        : ""
                    }`
                  : "—"}
              </span>
              <Button asChild variant="secondary">
                <Link href={`/coach/students/${r.studentId}/plan?week=${week}`}>
                  {r.status ? "Planı aç" : "Plan hazırla"}
                </Link>
              </Button>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
