-- Faz 5b: gidişat görünümleri (09 §1.4; hepsi security_invoker, karar TypeScript'te).
--   1. v_student_pace_facts: öğrenci × ünite düzeyi konu; durum, tamamlanma, hedef ve okul tarihi.
--   2. v_student_subject_targets: öğrenci × ders; soru hedefi / gerçekleşen (target_starts_on'dan
--      itibaren), konu sayıları.
--   3. v_coach_student_overview: sona has_targets, topics_total, topics_done, topics_overdue,
--      topics_ahead (K1 "Takvim" sütunu tek sorguda).
--   4. v_topic_alert_facts: sona target_on (Parça 3 strateji bağlamı; Parça 2 kuralı kullanmaz).
-- "Bitmiş" = status in ('completed','mastered'); gün İstanbul (karar #36).

-- 1. v_student_pace_facts -------------------------------------------------------------------------

create view public.v_student_pace_facts
with (security_invoker = true) as
select
  s.profile_id as student_id,
  s.organization_id,
  s.coach_id,
  sub.id as subject_id,
  sub.name as subject_name,
  sub.short_name as subject_short_name,
  sub.color as subject_color,
  sub.sort_order as subject_sort_order,
  t.id as topic_id,
  t.name as topic_name,
  t.sort_order as topic_sort_order,
  coalesce(p.status, 'not_started'::public.topic_status) as status,
  p.completed_at,
  tt.target_on,
  t.school_finish_on
from public.students s
join public.subjects sub on sub.template_id = s.curriculum_template_id
join public.topics t on t.subject_id = sub.id and t.parent_id is null
left join public.student_topic_progress p on p.student_id = s.profile_id and p.topic_id = t.id
left join public.student_topic_targets tt on tt.student_id = s.profile_id and tt.topic_id = t.id;

revoke all on table public.v_student_pace_facts from anon, authenticated;
grant select on table public.v_student_pace_facts to authenticated;
grant select on table public.v_student_pace_facts to service_role;

-- 2. v_student_subject_targets --------------------------------------------------------------------
-- Şablonun her dersi için bir satır; hedef yoksa questions_target null.

create view public.v_student_subject_targets
with (security_invoker = true) as
with today as (
  select (now() at time zone 'Europe/Istanbul')::date as d
),
topic_counts as (
  select
    f.student_id,
    f.subject_id,
    count(*)::int as topics_total,
    count(*) filter (where f.status in ('completed', 'mastered'))::int as topics_done,
    count(*) filter (
      where f.status not in ('completed', 'mastered') and f.target_on is not null and f.target_on <= today.d
    )::int as topics_overdue
  from public.v_student_pace_facts f
  cross join today
  group by f.student_id, f.subject_id
),
question_sums as (
  select l.student_id, l.subject_id, sum(l.total_count)::int as questions_done
  from public.question_logs l
  join public.students s on s.profile_id = l.student_id
  where s.target_starts_on is not null and l.log_date >= s.target_starts_on
  group by l.student_id, l.subject_id
)
select
  s.profile_id as student_id,
  s.organization_id,
  s.coach_id,
  sub.id as subject_id,
  sub.name as subject_name,
  sub.short_name as subject_short_name,
  sub.color as subject_color,
  sub.sort_order as subject_sort_order,
  sub.exam_question_count,
  st.questions as questions_target,
  coalesce(qs.questions_done, 0) as questions_done,
  coalesce(tc.topics_total, 0) as topics_total,
  coalesce(tc.topics_done, 0) as topics_done,
  coalesce(tc.topics_overdue, 0) as topics_overdue
from public.students s
join public.subjects sub on sub.template_id = s.curriculum_template_id
left join public.student_subject_targets st on st.student_id = s.profile_id and st.subject_id = sub.id
left join question_sums qs on qs.student_id = s.profile_id and qs.subject_id = sub.id
left join topic_counts tc on tc.student_id = s.profile_id and tc.subject_id = sub.id;

revoke all on table public.v_student_subject_targets from anon, authenticated;
grant select on table public.v_student_subject_targets to authenticated;
grant select on table public.v_student_subject_targets to service_role;

-- 3. v_coach_student_overview (mevcut kolonlar aynen + 5 kolon sona) ---------------------------

create or replace view public.v_coach_student_overview
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
    count(*) filter (
      where f.status not in ('completed', 'mastered') and f.target_on is not null and f.target_on <= t.d
    )::int as topics_overdue,
    count(*) filter (
      where f.status in ('completed', 'mastered') and f.target_on is not null and f.target_on > t.d
    )::int as topics_ahead
  from public.v_student_pace_facts f
  cross join today t
  group by f.student_id
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
  coalesce(pc.topics_overdue, 0) as topics_overdue,
  coalesce(pc.topics_ahead, 0) as topics_ahead
from public.students s
join public.profiles p on p.id = s.profile_id
left join week_totals wt on wt.student_id = s.profile_id
left join last_logs ll on ll.student_id = s.profile_id
left join weekly_goals wg on wg.student_id = s.profile_id
left join plan_week pw on pw.student_id = s.profile_id
left join plan_last_week plw on plw.student_id = s.profile_id
left join pace pc on pc.student_id = s.profile_id;

-- 4. v_topic_alert_facts (+ target_on, sona) -------------------------------------------------------

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
    tt.target_on
  from base b
  left join public.student_topic_progress p
    on p.student_id = b.student_id and p.topic_id = b.topic_id
  left join public.student_topic_targets tt
    on tt.student_id = b.student_id and tt.topic_id = b.topic_id
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
  (
    f.status = 'not_started'
    and row_number() over (
      partition by f.student_id, f.subject_id, (f.status = 'not_started')
      order by f.topic_sort_order, f.topic_id
    ) = 1
  ) as is_next_topic,
  f.school_finish_on,
  f.target_on
from facts f;
