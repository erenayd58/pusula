"use client";

import * as React from "react";
import { CheckIcon, RefreshCwIcon } from "lucide-react";
import { topicStatusLabels } from "@/content/labels";
import { cn } from "@/lib/utils";
import type { TopicStatus } from "@/types";

/** Durum ikonu (oturdu: beyaz onay; tekrar gerekli: yenile). Diğer durumların ikonu yok. */
function StatusIcon({ status, small }: { status: TopicStatus; small?: boolean }) {
  if (status === "mastered") {
    return (
      <CheckIcon
        aria-hidden="true"
        className={cn("relative", small ? "size-3" : "size-5 clay:size-6")}
        strokeWidth={3}
      />
    );
  }
  if (status === "needs_review") {
    return (
      <span
        aria-hidden="true"
        className={cn(
          "relative flex items-center justify-center rounded-full bg-bg-paper text-subject-ink",
          small ? "size-3.5" : "size-5 clay:size-6",
        )}
      >
        <RefreshCwIcon className={small ? "size-2.5" : "size-3 clay:size-3.5"} strokeWidth={2.5} />
      </span>
    );
  }
  return null;
}

/**
 * TopicMasteryCell (04 Bölüm 9): durum doluluk + desen + ikon ile (.topic-cell, globals.css).
 * Ders rengi kapsayıcıdan `subjectVars()` ile gelir. Erişilebilir ad konu + durumdur; bilgi
 * sadece renkle verilmez. Telefonda 44 px, masaüstünde 52 px; koçta (flat) 36 px.
 * `schoolPassed` (Faz 5a): okul konuyu bitirdi, öğrenci bitirmedi → üst sağ köşede küçük çentik
 * (`.topic-cell--school-passed`, currentColor; ders rengi değil) ve erişilebilir ada "okulda işlendi".
 */
export function TopicCell({
  name,
  status,
  selected = false,
  schoolPassed = false,
  tabIndex,
  className,
  ...props
}: Omit<React.ComponentProps<"button">, "name"> & {
  name: string;
  status: TopicStatus;
  selected?: boolean;
  schoolPassed?: boolean;
}) {
  return (
    <button
      type="button"
      data-status={status}
      data-selected={selected}
      data-school-passed={schoolPassed || undefined}
      aria-label={`${name}: ${topicStatusLabels[status]}${schoolPassed ? ", okulda işlendi" : ""}`}
      aria-pressed={selected}
      tabIndex={tabIndex}
      className={cn(
        "topic-cell flex shrink-0 items-center justify-center",
        "size-9 clay:size-11 clay:lg:size-[52px]",
        schoolPassed && "topic-cell--school-passed",
        className,
      )}
      {...props}
    >
      <StatusIcon status={status} />
    </button>
  );
}

/** Etkileşimsiz küçük örnek hücre: durum seçenekleri ve açıklama satırı için. */
export function TopicSwatch({ status, className }: { status: TopicStatus; className?: string }) {
  return (
    <span
      aria-hidden="true"
      data-status={status}
      className={cn("topic-cell flex size-6 shrink-0 items-center justify-center", className)}
    >
      <StatusIcon status={status} small />
    </span>
  );
}
