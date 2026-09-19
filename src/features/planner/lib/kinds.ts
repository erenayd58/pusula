import {
  BookMarkedIcon,
  BookOpenIcon,
  LinkIcon,
  PencilLineIcon,
  PlayIcon,
  RotateCcwIcon,
  SparklesIcon,
  type LucideIcon,
} from "lucide-react";
import type { PlanItemKind } from "@/types";
import type { TargetUnit } from "../types";

/**
 * Görev türü sunum tablosu (08 §3.2): kart, form ve başlık üretici buradan okur.
 * Faz 7: `section` (kaynak testi, hızlı kayıtla) ve `video` (oynatıcıya gider) satırları;
 * bu iki tür formdaki tür çiplerinde yoktur (`KIND_ORDER`), havuzdan ve öneriden gelir.
 */
export type KindSpec = {
  icon: LucideIcon;
  defaultTargetUnit: TargetUnit | null;
  needsTopic: boolean;
  needsUrl: boolean;
  /** quick-log: hızlı kayıt sheet'i ile tamamlanır; tap: tek dokunuş; watch: oynatıcıda "İzledim" (tap da olur). */
  completeMode: "quick-log" | "tap" | "watch";
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
  section: {
    icon: BookMarkedIcon,
    defaultTargetUnit: "questions",
    needsTopic: false,
    needsUrl: false,
    completeMode: "quick-log",
  },
  video: {
    icon: PlayIcon,
    defaultTargetUnit: "minutes",
    needsTopic: false,
    needsUrl: false,
    completeMode: "watch",
  },
};

/** Formdaki tür çipleri; `section` / `video` havuz ve öneriden gelir (düzenlemede tür sabit). */
export const KIND_ORDER: PlanItemKind[] = ["questions", "topic_study", "review", "link", "custom"];
