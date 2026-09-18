import {
  BookOpenIcon,
  LinkIcon,
  PencilLineIcon,
  RotateCcwIcon,
  SparklesIcon,
  type LucideIcon,
} from "lucide-react";
import type { PlanItemKind } from "@/types";
import type { TargetUnit } from "../types";

/**
 * Görev türü sunum tablosu (08 §3.2): kart, form ve başlık üretici buradan okur.
 * Faz 5'te `section` / `video` satırı eklemek yeterli.
 */
export type KindSpec = {
  icon: LucideIcon;
  defaultTargetUnit: TargetUnit | null;
  needsTopic: boolean;
  needsUrl: boolean;
  /** quick-log: hızlı kayıt sheet'i ile tamamlanır; tap: tek dokunuş. */
  completeMode: "quick-log" | "tap";
};

export const KIND_SPECS: Record<PlanItemKind, KindSpec> = {
  topic_study: {
    icon: BookOpenIcon,
    defaultTargetUnit: "minutes",
    needsTopic: true,
    needsUrl: false,
    completeMode: "tap",
  },
  questions: {
    icon: PencilLineIcon,
    defaultTargetUnit: "questions",
    needsTopic: false,
    needsUrl: false,
    completeMode: "quick-log",
  },
  review: {
    icon: RotateCcwIcon,
    defaultTargetUnit: "minutes",
    needsTopic: true,
    needsUrl: false,
    completeMode: "tap",
  },
  link: {
    icon: LinkIcon,
    defaultTargetUnit: null,
    needsTopic: false,
    needsUrl: true,
    completeMode: "tap",
  },
  custom: {
    icon: SparklesIcon,
    defaultTargetUnit: null,
    needsTopic: false,
    needsUrl: false,
    completeMode: "tap",
  },
};

export const KIND_ORDER: PlanItemKind[] = ["questions", "topic_study", "review", "link", "custom"];
