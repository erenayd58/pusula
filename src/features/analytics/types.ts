import type { TopicAlertKind, TopicStatus } from "@/types";

/** `v_topic_alert_facts` satırı: öğrenci × ünite düzeyi konu (08 §1.5). Karar vermez. */
export type TopicAlertFacts = {
  studentId: string;
  organizationId: string;
  coachId: string;
  subjectId: string;
  subjectName: string;
  subjectShortName: string;
  subjectColor: string;
  subjectSortOrder: number;
  examQuestionCount: number | null;
  topicId: string;
  topicName: string;
  topicSortOrder: number;
  /** Satır yoksa `not_started`. */
  status: TopicStatus;
  /** `student_topic_progress.updated_at`; satır yoksa null. */
  statusChangedAt: string | null;
  completedAt: string | null;
  lastReviewedAt: string | null;
  /** Son `alerts.lookback_days` içindeki soru ve doğru sayısı. */
  questionsWindow: number;
  correctWindow: number;
  /** Konudaki son kayıt günü (pencere dışı da olabilir). */
  lastTopicLogDate: string | null;
  /** Dersin herhangi bir konusundaki (konusuz dahil) son kayıt günü. */
  subjectLastLogDate: string | null;
  /** Öğrencinin ilk kayıt günü; derste hiç kayıt yoksa ihmal süresi buradan sayılır. */
  studentFirstLogDate: string | null;
  /** Dersin sort_order'a göre ilk başlanmamış konusu. */
  isNextTopic: boolean;
};

export type AlertSubject = {
  id: string;
  name: string;
  shortName: string;
  color: string;
  sortOrder: number;
  examQuestionCount: number | null;
};

/**
 * Bir uyarı: konu başına en fazla bir (ders düzeyinde `topicId` null). Sayısal alanlar
 * Parça 4'ün önem puanı için (gecikme, zayıflık); metin `alertReason` ile üretilir.
 */
export type TopicAlert = {
  studentId: string;
  subject: AlertSubject;
  topicId: string | null;
  topicName: string | null;
  topicSortOrder: number | null;
  kind: TopicAlertKind;
  /** Pencere içi soru sayısı ve başarı yüzdesi (0–100, boş yanlış sayılır); soru yoksa null. */
  questions: number;
  accuracy: number | null;
  /** Kuralın başarı eşiği (knowledge_gap / low_accuracy / forgetting_risk); yoksa null. */
  threshold: number | null;
  /** Son etkinlikten (kayıt / tekrar / tamamlama / durum değişimi) bu yana gün; yoksa null. */
  idleDays: number | null;
  /** Kuralın gün eşiğini aşan gün sayısı (0 = tam eşikte); başarı kurallarında 0. */
  delayDays: number;
};

/** Koç ve öğrenci ekranları için gruplar (08 §2 Parça 3). */
export type AlertGroup = {
  /** knowledge_gap, low_accuracy */
  weak: TopicAlert[];
  /** review_due, forgetting_risk, stale */
  maintenance: TopicAlert[];
  notStarted: TopicAlert[];
  /** neglected_subject (ders düzeyi) */
  subjects: TopicAlert[];
};
