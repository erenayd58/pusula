-- Faz 6b: uyarı olguları ve ders deneme istatistiği (10-faz6-denemeler.md §1.5).
--   1. v_topic_alert_facts sona üç kolon (create or replace; mevcut kolon sırası korunur):
--      mock_recent_count (öğrencinin son `mock_exams.recent_count` GENEL denemesi sayısı),
--      mock_wrong_recent (bu denemelerin kaçında konu işaretli), mistakes_window (son
--      `alerts.lookback_days` içinde açılmış defter kaydı; durum fark etmez). Karar TypeScript'te
--      (`mock_weak` kuralı, C11).
--   2. v_student_mock_subject_stats (security_invoker): öğrenci × ders; son `recent_count` sonuç
--      (genel + bu dersin branşı) üzerinden exams_count, avg_net, last_net, wrong_total. Kullanan:
--      analytics getStrategyContext (deneme açığı C12 + "son 3 denemede 7 yanlış" notu).
-- Tanımlar 10 §3.1 ile aynı: genel deneme = sonuç ve katalog subject_id boş; son N = taken_on desc,
-- created_at desc.

-- 1. v_topic_alert_facts (+ mock_recent_count, mock_wrong_recent, mistakes_window; sona) ---------

create or replace view public.v_topic_alert_facts
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
    coalesce((o.settings #>> '{mock_exams,recent_count}')::int, 3) as recent_count,
    sub.id as subject_id,
    sub.name as subject_name,
    sub.short_name as subject_short_name,
    sub.color as subject_color,
    sub.sort_order as subject_sort_order,
    sub.exam_question_count,
    t.id as topic_id,
    t.name as topic_name,
    t.sort_order as topic_sort_order,
    t.school_finish_on
  from public.students s
  join public.organizations o on o.id = s.organization_id
  join public.subjects sub on sub.template_id = s.curriculum_template_id
  join public.topics t on t.subject_id = sub.id and t.parent_id is null
),
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
subject_logs as (
  select student_id, subject_id, max(log_date) as subject_last_log_date
  from public.question_logs
  group by student_id, subject_id
),
student_logs as (
  select student_id, min(log_date) as student_first_log_date
  from public.question_logs
  group by student_id
),
-- Öğrencinin genel denemeleri, yeniden eskiye sıra numarasıyla (son N penceresi).
general_mocks as (
  select
    r.id as result_id,
    r.student_id,
    row_number() over (partition by r.student_id order by r.taken_on desc, r.created_at desc) as rn
  from public.mock_exam_results r
  left join public.mock_exams e on e.id = r.mock_exam_id
  where r.subject_id is null and e.subject_id is null
),
recent_mocks as (
  select gm.student_id, gm.result_id
  from general_mocks gm
  join public.students s on s.profile_id = gm.student_id
  join public.organizations o on o.id = s.organization_id
  where gm.rn <= coalesce((o.settings #>> '{mock_exams,recent_count}')::int, 3)
),
recent_mock_counts as (
  select student_id, count(*)::int as mock_recent_count
  from recent_mocks
  group by student_id
),
topic_marks as (
  select rm.student_id, m.topic_id, count(*)::int as mock_wrong_recent
  from recent_mocks rm
  join public.mock_exam_topic_mistakes m on m.result_id = rm.result_id
  group by rm.student_id, m.topic_id
),
topic_mistakes as (
  select
    b.student_id,
    b.topic_id,
    count(mi.id)::int as mistakes_window
  from base b
  cross join today
  join public.mistakes mi
    on mi.student_id = b.student_id
   and mi.topic_id = b.topic_id
   and (mi.created_at at time zone 'Europe/Istanbul')::date >= today.d - b.lookback_days
  group by b.student_id, b.topic_id
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
    stl.student_first_log_date,
    tt.target_on,
    coalesce(rmc.mock_recent_count, 0) as mock_recent_count,
    coalesce(tm.mock_wrong_recent, 0) as mock_wrong_recent,
    coalesce(tmi.mistakes_window, 0) as mistakes_window
  from base b
  left join public.student_topic_progress p
    on p.student_id = b.student_id and p.topic_id = b.topic_id
  left join public.student_topic_targets tt
    on tt.student_id = b.student_id and tt.topic_id = b.topic_id
  left join topic_logs tl on tl.student_id = b.student_id and tl.topic_id = b.topic_id
  left join subject_logs sl on sl.student_id = b.student_id and sl.subject_id = b.subject_id
  left join student_logs stl on stl.student_id = b.student_id
  left join recent_mock_counts rmc on rmc.student_id = b.student_id
  left join topic_marks tm on tm.student_id = b.student_id and tm.topic_id = b.topic_id
  left join topic_mistakes tmi on tmi.student_id = b.student_id and tmi.topic_id = b.topic_id
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
  (
    f.status = 'not_started'
    and row_number() over (
      partition by f.student_id, f.subject_id, (f.status = 'not_started')
      order by f.topic_sort_order, f.topic_id
    ) = 1
  ) as is_next_topic,
  f.school_finish_on,
  f.target_on,
  f.mock_recent_count,
  f.mock_wrong_recent,
  f.mistakes_window
from facts f;

-- 2. v_student_mock_subject_stats -----------------------------------------------------------------
-- Öğrenci × şablon dersi; pencere = son recent_count sonuç (genel + bu dersin branşı; taken_on desc,
-- created_at desc) içinde o dersin satırı olanlar. Sonuç yoksa exams_count 0, netler null.

create view public.v_student_mock_subject_stats
with (security_invoker = true) as
with base as (
  select
    s.profile_id as student_id,
    s.organization_id,
    s.coach_id,
    coalesce((o.settings #>> '{mock_exams,recent_count}')::int, 3) as recent_count,
    sub.id as subject_id,
    sub.exam_question_count
  from public.students s
  join public.organizations o on o.id = s.organization_id
  join public.subjects sub on sub.template_id = s.curriculum_template_id
),
subject_results as (
  select
    b.student_id,
    b.subject_id,
    sr.net,
    sr.wrong_count,
    row_number() over (
      partition by b.student_id, b.subject_id
      order by r.taken_on desc, r.created_at desc
    ) as rn,
    b.recent_count
  from base b
  join public.mock_exam_results r on r.student_id = b.student_id
  left join public.mock_exams e on e.id = r.mock_exam_id
  join public.mock_exam_subject_results sr on sr.result_id = r.id and sr.subject_id = b.subject_id
  where coalesce(r.subject_id, e.subject_id) is null
     or coalesce(r.subject_id, e.subject_id) = b.subject_id
),
windowed as (
  select
    student_id,
    subject_id,
    count(*)::int as exams_count,
    round(avg(net), 2) as avg_net,
    max(net) filter (where rn = 1) as last_net,
    sum(wrong_count)::int as wrong_total
  from subject_results
  where rn <= recent_count
  group by student_id, subject_id
)
select
  b.student_id,
  b.organization_id,
  b.coach_id,
  b.subject_id,
  coalesce(w.exams_count, 0) as exams_count,
  w.avg_net,
  w.last_net,
  coalesce(w.wrong_total, 0) as wrong_total,
  b.exam_question_count
from base b
left join windowed w on w.student_id = b.student_id and w.subject_id = b.subject_id;

revoke all on table public.v_student_mock_subject_stats from anon, authenticated;
grant select on table public.v_student_mock_subject_stats to authenticated;
grant select on table public.v_student_mock_subject_stats to service_role;
