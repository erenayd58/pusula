import type { PeriodMix } from "@/lib/strategy/periods";
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
  /** Okulda tahmini bitiş (`topics.school_finish_on`); takvim doldurulmadıysa null (Faz 5a). */
  schoolFinishOn: string | null;
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

/** `v_student_setup_facts` satırı + öğrencinin kapalı modülleri (sorgu katmanı ekler). */
export type SetupFacts = {
  studentId: string;
  /** students.created_at (hesap yaşı). */
  createdAt: string;
  hasSchedule: boolean;
  hasActiveGoal: boolean;
  hasPublishedPlanWeek: boolean;
  questionLogCount: number;
  /** Kapalı modül kimlikleri (`student_modules.enabled = false`); ilgili uyarı üretilmez. */
  disabledModules: readonly string[];
};

export type SetupAlertKind = "no_schedule" | "no_goal" | "no_plan" | "no_logs";

/**
 * Kurulum uyarısı (yalnızca koç): yeni öğrencide eksik adımlar. Soru kaydı olan öğrencide
 * program ve kayıt uyarıları üretilmez; plan ve hedef eksiği her zaman gösterilir.
 */
export type SetupAlert = { studentId: string; kind: SetupAlertKind };

/**
 * Koç ekranları için gruplar (08 §2 Parça 3, 09 §2 Parça 1). `not_started` dikkat gerektirmez ve
 * gruplanmaz (Bugün kartı `pickStudentNudge` ile ayrı seçer).
 */
export type AlertGroup = {
  /** knowledge_gap, low_accuracy */
  weak: TopicAlert[];
  /** behind_school: okul bitirdi, öğrenci bitirmedi (Faz 5a) */
  behind: TopicAlert[];
  /** review_due, forgetting_risk, stale */
  maintenance: TopicAlert[];
  /** neglected_subject (ders düzeyi) */
  subjects: TopicAlert[];
};

/**
 * Öğrencinin strateji bağlamı (09 §2 Parça 3): sorgu katmanı kurum ayarı + `students.exam_date`
 * + gidişat görünümlerinden kurar, `buildSuggestions` puan ve kotada kullanır. Verilmezse Faz 4
 * davranışı birebir.
 */
export type StudentStrategy = {
  /** `students.exam_date`'e kalan gün; sınav tarihi yoksa null (yakınlık 0). */
  daysToExam: number | null;
  /** Bugünü kapsayan sezon döneminin karışımı (`periodFor`); dönem yoksa null (kota yok). */
  mix: PeriodMix | null;
  /** Konu → hedef tarihini aşan gün (`student_topic_targets`; yalnızca bitmemiş ve tarihi geçmiş). */
  topicDelayDays: ReadonlyMap<string, number>;
  /** Ders → 0–1 soru açığı: (bugüne kadar beklenen − gerçekleşen) / beklenen; hedef yoksa boş. */
  subjectGap: ReadonlyMap<string, number>;
};
