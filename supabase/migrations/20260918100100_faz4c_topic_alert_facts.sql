-- Faz 4c: konu uyarı olguları (08 §1.5). Görünüm yalnızca OLGULARI verir, karar vermez
-- (karar A2): kurallar TypeScript'te (features/analytics/lib/alerts.ts), eşikler kurum
-- ayarından parametre. Ünite düzeyi konular (parent_id boş, karar #29), öğrenci × konu başına
-- bir satır. security_invoker: students / student_topic_progress / question_logs RLS'si uygulanır
-- (koç kendi öğrencisini, owner kurumu, öğrenci kendini, veli çocuğunu görür).
--
-- topic_alert_kind enum'u burada tanımlanır; Parça 4 `suggestion_dismissals.kind` bunu kullanır.

create type public.topic_alert_kind as enum (
  'knowledge_gap', 'low_accuracy', 'review_due', 'forgetting_risk',
  'stale', 'not_started', 'neglected_subject'
);

create view public.v_topic_alert_facts
with (security_invoker = true) as
with today as (
  select (now() at time zone 'Europe/Istanbul')::date as d
),
base as (
  select
    s.profile_id as student_id,
    s.organization_id,
    s.coach_id,
    coalesce((o.settings #>> '{alerts,lookback_days}')::int, 60) as lookback_days,
    sub.id as subject_id,
    sub.name as subject_name,
    sub.short_name as subject_short_name,
    sub.color as subject_color,
    sub.sort_order as subject_sort_order,
    sub.exam_question_count,
    t.id as topic_id,
    t.name as topic_name,
    t.sort_order as topic_sort_order
  from public.students s
  join public.organizations o on o.id = s.organization_id
  join public.subjects sub on sub.template_id = s.curriculum_template_id
  join public.topics t on t.subject_id = sub.id and t.parent_id is null
),
-- Konu başına: pencere içi soru/doğru (pencere kurum ayarından) ve son kayıt günü (pencere dışı).
topic_logs as (
  select
    b.student_id,
    b.topic_id,
    coalesce(sum(l.total_count) filter (where l.log_date >= today.d - b.lookback_days), 0)::int
      as questions_window,
    coalesce(sum(coalesce(l.correct_count, 0)) filter (where l.log_date >= today.d - b.lookback_days), 0)::int
      as correct_window,
    max(l.log_date) as last_topic_log_date
  from base b
  cross join today
  join public.question_logs l on l.student_id = b.student_id and l.topic_id = b.topic_id
  group by b.student_id, b.topic_id
),
-- Ders başına son kayıt (konusuz kayıtlar dahil): ihmal edilen ders kuralı.
subject_logs as (
  select student_id, subject_id, max(log_date) as subject_last_log_date
  from public.question_logs
  group by student_id, subject_id
),
-- Öğrencinin ilk kaydı: derste hiç kayıt yoksa ihmal süresi buradan sayılır.
student_logs as (
  select student_id, min(log_date) as student_first_log_date
  from public.question_logs
  group by student_id
),
facts as (
  select
    b.*,
    coalesce(p.status, 'not_started'::public.topic_status) as status,
    p.updated_at as status_changed_at,
    p.completed_at,
    p.last_reviewed_at,
    coalesce(tl.questions_window, 0) as questions_window,
    coalesce(tl.correct_window, 0) as correct_window,
    tl.last_topic_log_date,
    sl.subject_last_log_date,
    stl.student_first_log_date
  from base b
  left join public.student_topic_progress p
    on p.student_id = b.student_id and p.topic_id = b.topic_id
  left join topic_logs tl on tl.student_id = b.student_id and tl.topic_id = b.topic_id
  left join subject_logs sl on sl.student_id = b.student_id and sl.subject_id = b.subject_id
  left join student_logs stl on stl.student_id = b.student_id
)
select
  f.student_id,
  f.organization_id,
  f.coach_id,
  f.subject_id,
  f.subject_name,
  f.subject_short_name,
  f.subject_color,
  f.subject_sort_order,
  f.exam_question_count,
  f.topic_id,
  f.topic_name,
  f.topic_sort_order,
  f.status,
  f.status_changed_at,
  f.completed_at,
  f.last_reviewed_at,
  f.questions_window,
  f.correct_window,
  f.last_topic_log_date,
  f.subject_last_log_date,
  f.student_first_log_date,
  -- Dersin sort_order'a göre ilk başlanmamış konusu.
  (
    f.status = 'not_started'
    and row_number() over (
      partition by f.student_id, f.subject_id, (f.status = 'not_started')
      order by f.topic_sort_order, f.topic_id
    ) = 1
  ) as is_next_topic
from facts f;

revoke all on table public.v_topic_alert_facts from anon, authenticated;
grant select on table public.v_topic_alert_facts to authenticated;
grant select on table public.v_topic_alert_facts to service_role;
