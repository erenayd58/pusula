-- Faz 8c: öğrenci düzeyi uyarı olguları (12-faz8-veli-bildirim.md §1.3).
--   1. Kurum ayarı student_alerts (üst düzey anahtar; sığ birleştirme): hareketsizlik günü, hedef
--      geride (haftanın hangi gününden itibaren, yüzde), net düşüşü eşiği, plan uyumu düşük yüzdesi,
--      birikmiş tekrar üst sınırı, hareketsizlik bildirimi tekrar aralığı. Kurallar TypeScript'te
--      (features/analytics/lib/student-alerts.ts); eşikler koda gömülmez.
--   2. v_review_queue: tekrar kuyruğu (03 §6'da planlı; şimdilik item_type = 'topic', Faz 6b
--      'mistake' ekler). TS review_due kuralının birebir SQL'i, v_topic_alert_facts üzerinden:
--      bitmiş konu, completed_at'ten bu yana geçen güne sığan en büyük review_due_days aralığı m,
--      due_on = tamamlanma günü + m; due_on'dan sonra konuda kayıt ya da tekrar varsa kuyrukta değil.
--   3. v_coach_student_overview (drop + create, Faz 5b/6a kalıbı) + overdue_reviews.

-- 1. Kurum ayarı ------------------------------------------------------------------------------

create or replace function private.default_org_settings()
returns jsonb
language sql immutable
set search_path = ''
as $$
  select jsonb_build_object(
    'schedule', jsonb_build_object('wake_start', '08:00', 'wake_end', '22:00'),
    'planner', jsonb_build_object(
      'minutes_per_question', 1.5,
      'topic_study_minutes', 40, 'review_minutes', 20, 'link_minutes', 15, 'custom_minutes', 30,
      'questions_target', 20,
      'day_capacity_ratio', 0.7, 'max_items_per_subject_per_day', 2
    ),
    'alerts', jsonb_build_object(
      'lookback_days', 60,
      'knowledge_gap', jsonb_build_object('min_questions', 40, 'max_accuracy', 55),
      'low_accuracy', jsonb_build_object('min_questions', 20, 'max_accuracy', 60),
      'review_due_days', jsonb_build_array(7, 15, 30),
      'forgetting_risk', jsonb_build_object('min_accuracy', 60, 'idle_days', 21),
      'stale_days', 45,
      'neglected_subject_days', 10,
      'setup_account_days', 7
    ),
    'suggestions', jsonb_build_object('max_per_student', 5, 'dismiss_days', 14),
    'strategy', jsonb_build_object(
      'periods', jsonb_build_array(),
      'proximity_days', 120,
      'school_lag_weeks', 2,
      'topic_minutes_default', 90,
      'pace_window_days', 28,
      'topics_finish_weeks_before_exam', 8
    ),
    'mock_exams', jsonb_build_object(
      'recent_count', 3,
      'weak_min_marks', 2,
      'weak_min_mistakes', 3,
      'gap_weight', 0.5
    ),
    'student_alerts', jsonb_build_object(
      'inactivity_days', 3,
      'goal_behind', jsonb_build_object('from_isodow', 3, 'min_percent', 40),
      'net_drop', 5,
      'low_plan_percent', 50,
      'overdue_reviews_max', 15,
      'inactivity_notify_days', 7
    )
  )
$$;

revoke all on function private.default_org_settings() from public, anon, authenticated;

-- Mevcut kurumlara yalnızca eksik anahtar yazılır (mevcut değer kazanır).
update public.organizations
  set settings = private.default_org_settings() || settings;

-- 2. v_review_queue ---------------------------------------------------------------------------

create view public.v_review_queue
with (security_invoker = true) as
with today as (
  select (now() at time zone 'Europe/Istanbul')::date as d
),
done_topics as (
  select
    f.*,
    (f.completed_at at time zone 'Europe/Istanbul')::date as completed_on,
    coalesce(o.settings #> '{alerts,review_due_days}', '[7, 15, 30]'::jsonb) as due_days
  from public.v_topic_alert_facts f
  join public.organizations o on o.id = f.organization_id
  where f.status in ('completed', 'mastered') and f.completed_at is not null
),
due as (
  select
    d.*,
    t.d as today,
    (
      select max((e.v)::int)
      from jsonb_array_elements_text(d.due_days) e(v)
      where (e.v)::int <= t.d - d.completed_on
    ) as m
  from done_topics d
  cross join today t
)
select
  student_id,
  organization_id,
  coach_id,
  'topic'::text as item_type,
  topic_id as item_id,
  subject_id,
  subject_name,
  subject_short_name,
  subject_color,
  topic_name,
  (completed_on + m) as due_on,
  (today - (completed_on + m))::int as overdue_days
from due
where m is not null
  and (last_topic_log_date is null or last_topic_log_date < completed_on + m)
  and (last_reviewed_at is null or (last_reviewed_at at time zone 'Europe/Istanbul')::date < completed_on + m);

revoke all on table public.v_review_queue from anon, authenticated;
grant select on table public.v_review_queue to authenticated;
grant select on table public.v_review_queue to service_role;

-- 3. v_coach_student_overview + overdue_reviews ------------------------------------------------

drop view public.v_coach_student_overview;

create view public.v_coach_student_overview
with (security_invoker = true) as
with today as (
  select (now() at time zone 'Europe/Istanbul')::date as d
),
week as (
  select (date_trunc('week', d))::date as week_start from today
),
week_totals as (
  select l.student_id, sum(l.total_count)::int as week_questions
  from public.question_logs l, week w
  where l.log_date >= w.week_start and l.log_date < w.week_start + 7
  group by l.student_id
),
last_logs as (
  select student_id, max(log_date) as last_log_date
  from public.question_logs
  group by student_id
),
weekly_goals as (
  select student_id, target_value as weekly_target
  from public.goals
  where is_active and period = 'weekly'
),
plan_week as (
  select c.student_id, c.percent, c.items_total, c.items_completed, c.to_date_percent
  from public.v_plan_completion c, week w
  where c.week_start = w.week_start and c.status = 'published'
),
plan_last_week as (
  select c.student_id, c.percent
  from public.v_plan_completion c, week w
  where c.week_start = w.week_start - 7 and c.status = 'published'
),
pace as (
  select
    f.student_id,
    count(*)::int as topics_total,
    count(*) filter (where f.status in ('completed', 'mastered'))::int as topics_done,
    count(*) filter (where f.target_on is not null and f.target_on <= t.d)::int as topics_expected
  from public.v_student_pace_facts f
  cross join today t
  group by f.student_id
),
-- Genel denemeler (sonuç ve katalog subject_id boş), toplam net = Σ ders neti; sıra taken_on desc,
-- created_at desc (10 §3.1 "son N" tanımı).
general_mocks as (
  select
    r.student_id,
    r.taken_on,
    coalesce(sum(sr.net), 0)::numeric as total_net,
    row_number() over (partition by r.student_id order by r.taken_on desc, r.created_at desc) as rn
  from public.mock_exam_results r
  left join public.mock_exams e on e.id = r.mock_exam_id
  left join public.mock_exam_subject_results sr on sr.result_id = r.id
  where r.subject_id is null and e.subject_id is null
  group by r.id, r.student_id, r.taken_on, r.created_at
),
last_mock as (
  select student_id, taken_on as last_mock_on, total_net as last_net from general_mocks where rn = 1
),
prev_mock as (
  select student_id, total_net as prev_net from general_mocks where rn = 2
),
-- Faz 8: birikmiş tekrar (v_review_queue; kuyruktaki her satır bugün ya da öncesinde vadesi dolmuştur).
overdue as (
  select student_id, count(*)::int as overdue_reviews
  from public.v_review_queue
  group by student_id
)
select
  s.profile_id as student_id,
  s.coach_id,
  s.organization_id,
  p.full_name,
  p.username,
  s.status,
  s.season,
  ll.last_log_date,
  coalesce(wt.week_questions, 0) as week_questions,
  wg.weekly_target,
  case
    when wg.weekly_target is null then null
    else least(100, floor(coalesce(wt.week_questions, 0) * 100 / wg.weekly_target))::int
  end as week_goal_percent,
  pw.percent as plan_percent_week,
  pw.items_total as plan_items_week,
  pw.items_completed as plan_done_week,
  plw.percent as plan_percent_last_week,
  pw.to_date_percent as plan_to_date_percent_week,
  (s.topics_finish_by is not null) as has_targets,
  coalesce(pc.topics_total, 0) as topics_total,
  coalesce(pc.topics_done, 0) as topics_done,
  coalesce(pc.topics_expected, 0) as topics_expected,
  greatest(0, coalesce(pc.topics_expected, 0) - coalesce(pc.topics_done, 0)) as topics_behind,
  greatest(0, coalesce(pc.topics_done, 0) - coalesce(pc.topics_expected, 0)) as topics_ahead,
  lm.last_net,
  pm.prev_net,
  (lm.last_net - pm.prev_net) as net_delta,
  lm.last_mock_on,
  coalesce(od.overdue_reviews, 0) as overdue_reviews
from public.students s
join public.profiles p on p.id = s.profile_id
left join week_totals wt on wt.student_id = s.profile_id
left join last_logs ll on ll.student_id = s.profile_id
left join weekly_goals wg on wg.student_id = s.profile_id
left join plan_week pw on pw.student_id = s.profile_id
left join plan_last_week plw on plw.student_id = s.profile_id
left join pace pc on pc.student_id = s.profile_id
left join last_mock lm on lm.student_id = s.profile_id
left join prev_mock pm on pm.student_id = s.profile_id
left join overdue od on od.student_id = s.profile_id;

revoke all on table public.v_coach_student_overview from anon, authenticated;
grant select on table public.v_coach_student_overview to authenticated;
grant select on table public.v_coach_student_overview to service_role;
