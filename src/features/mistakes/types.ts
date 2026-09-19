import type { ReasonSlice } from "@/lib/exam/mistakes";
import type { MistakeReason, MistakeStatus } from "@/types";

/** Form seçenekleri: şablon dersleri ve ünite düzeyi konuları. */
export type MistakeSubject = {
  subjectId: string;
  name: string;
  shortName: string;
  color: string;
  sortOrder: number;
  topics: { topicId: string; name: string }[];
};

export type MistakeOptions = {
  /** Depo yolu öneki için: `{organizationId}/{studentId}/`. */
  organizationId: string;
  subjects: MistakeSubject[];
};

/** Liste kartı / detay. */
export type Mistake = {
  id: string;
  studentId: string;
  subjectId: string;
  subjectName: string;
  subjectShortName: string;
  subjectColor: string;
  topicId: string | null;
  topicName: string | null;
  /** Deneme kısayolundan geldiyse; detayda "Denemeye git" bağlantısı (yalnızca URL, modül importu yok). */
  mockResultId: string | null;
  imagePath: string | null;
  /** İmzalı URL (liste 10 dk, detay 60 dk); fotoğraf yoksa null. */
  imageUrl: string | null;
  reason: MistakeReason;
  note: string | null;
  status: MistakeStatus;
  solvedAt: string | null;
  createdAt: string;
};

export type MistakeFilters = {
  subjectId?: string;
  status?: MistakeStatus;
  reason?: MistakeReason;
};

/** Koç: hata nedeni dağılımı (son `alerts.lookback_days`). */
export type ReasonDistribution = {
  slices: ReasonSlice[];
  total: number;
  lookbackDays: number;
  /** "Yanlışların %38'i bilgi eksiği"; baskın neden bilinmiyorsa null. */
  sentence: string | null;
};

/** Koç: konu bazlı defter kaydı sayısı (açık / çözülmüş). */
export type TopicMistakeCount = {
  topicId: string;
  topicName: string;
  subjectId: string;
  subjectShortName: string;
  subjectColor: string;
  open: number;
  solved: number;
};
