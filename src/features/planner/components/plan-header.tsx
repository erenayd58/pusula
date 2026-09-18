"use client";

import Link from "next/link";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  PanelLeftCloseIcon,
  PanelLeftOpenIcon,
  PrinterIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { planStatusLabels } from "@/content/labels";
import { formatCount, formatDuration, formatTimeTr, formatWeekRange } from "@/lib/format";
import type { PlanStatus } from "@/types";

/**
 * K3 başlığı: hafta seçici (bağlantı, `?week=`), durum + son kayıt saati, hafta toplamı,
 * nötr "N görev ertelendi" satırı, ikincil eylemler ve "Planı yayınla".
 */
export function PlanHeader({
  studentName,
  weekStart,
  prevWeek,
  nextWeek,
  basePath,
  status,
  lastSavedAt,
  totals,
  postponed,
  readOnly,
  hasItems,
  pending,
  poolOpen,
  onTogglePool,
  onCopyLastWeek,
  onCopyToOthers,
  onCarryOver,
  onPublish,
}: {
  studentName: string;
  weekStart: string;
  prevWeek: string;
  nextWeek: string;
  basePath: string;
  status: PlanStatus | null;
  lastSavedAt: string | null;
  totals: { minutes: number; questions: number; count: number };
  postponed: number;
  readOnly: boolean;
  hasItems: boolean;
  pending: boolean;
  poolOpen: boolean;
  onTogglePool: () => void;
  onCopyLastWeek: () => void;
  onCopyToOthers: () => void;
  onCarryOver: () => void;
  onPublish: () => void;
}) {
  const savedLabel = lastSavedAt ? `son kayıt ${formatTimeTr(lastSavedAt)}` : null;

  return (
    <header className="flex flex-col gap-3 print:hidden">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="text-title font-semibold tracking-tight">{`${studentName} · haftalık plan`}</h1>
          <p className="flex flex-wrap items-center gap-2 text-small text-ink-500">
            <Badge tone={status === "published" ? "success" : "neutral"}>
              {status ? planStatusLabels[status] : "Plan yok"}
            </Badge>
            {savedLabel ? <span>{savedLabel} (otomatik)</span> : null}
            {postponed > 0 ? <span>{`${formatCount(postponed, "görev")} ertelendi`}</span> : null}
          </p>
        </div>
        <nav aria-label="Hafta seçici" className="flex items-center gap-1">
          <Button asChild variant="secondary" size="icon" aria-label="Önceki hafta">
            <Link href={`${basePath}?week=${prevWeek}`}>
              <ChevronLeftIcon aria-hidden="true" />
            </Link>
          </Button>
          <span className="min-w-[10rem] text-center text-small font-medium text-ink-900 tabular-nums">
            {formatWeekRange(weekStart, { year: true })}
          </span>
          <Button asChild variant="secondary" size="icon" aria-label="Sonraki hafta">
            <Link href={`${basePath}?week=${nextWeek}`}>
              <ChevronRightIcon aria-hidden="true" />
            </Link>
          </Button>
        </nav>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          {!readOnly ? (
            <Button
              type="button"
              variant="secondary"
              aria-label={poolOpen ? "Görev havuzunu daralt" : "Görev havuzunu aç"}
              aria-expanded={poolOpen}
              onClick={onTogglePool}
            >
              {poolOpen ? (
                <PanelLeftCloseIcon aria-hidden="true" />
              ) : (
                <PanelLeftOpenIcon aria-hidden="true" />
              )}
              Görev havuzu
            </Button>
          ) : null}
          <p className="text-small text-ink-700 tabular-nums">
            {`Hafta toplamı: ${formatCount(totals.count, "görev")} · ${formatDuration(totals.minutes)}${
              totals.questions > 0 ? ` · ${formatCount(totals.questions, "soru")}` : ""
            }`}
          </p>
        </div>
        {!readOnly ? (
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="secondary" onClick={onCopyLastWeek} disabled={pending}>
              Geçen haftayı kopyala
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={onCopyToOthers}
              disabled={pending || !hasItems}
            >
              Başka öğrencilere kopyala
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={onCarryOver}
              disabled={pending || !hasItems}
            >
              Tamamlanmayanları aktar
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => window.print()}
              aria-label="Yazdır"
            >
              <PrinterIcon aria-hidden="true" />
              Yazdır
            </Button>
            <Button
              type="button"
              onClick={onPublish}
              disabled={pending || !hasItems || status === "published"}
            >
              {status === "published" ? "Yayınlandı" : "Planı yayınla"}
            </Button>
          </div>
        ) : (
          <p className="text-small text-ink-500">Düzenlemek için bilgisayardan açın.</p>
        )}
      </div>
    </header>
  );
}
