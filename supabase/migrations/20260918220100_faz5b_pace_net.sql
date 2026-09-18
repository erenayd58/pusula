-- Faz 5b düzeltme: gidişat "net takvim konumu" (09 §3.1 güncel tanım). Beklenen = hedefi bugün ya
-- da öncesi olan konular (bitmiş olsun olmasın); hedefsiz bitmiş konular takvimin önündedir,
-- beklenene girmez. Geride = greatest(0, beklenen − bitmiş), ileride = greatest(0, bitmiş − beklenen).
-- Önceki konu bazlı sayım (gecikmiş / hedefi gelecekte bitmiş) "9 konu bitmiş ama 4 konu geride"
-- gibi çelişkili okunuyordu. Kolon adları değiştiği için iki görünüm drop + create.
--   v_student_subject_targets: topics_overdue → topics_expected
--   v_coach_student_overview:  topics_overdue, topics_ahead → topics_expected, topics_behind, topics_ahead

drop view public.v_coach_student_overview;
drop view public.v_student_subject_targets;

-- v_student_subject_targets ---------------------------------------------------------------------

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
    count(*) filter (where f.target_on is not null and f.target_on <= today.d)::int as topics_expected
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
  coalesce(tc.topics_expected, 0) as topics_expected
from public.students s
join public.subjects sub on sub.template_id = s.curriculum_template_id
left join public.student_subject_targets st on st.student_id = s.profile_id and st.subject_id = sub.id
left join question_sums qs on qs.student_id = s.profile_id and qs.subject_id = sub.id
left join topic_counts tc on tc.student_id = s.profile_id and tc.subject_id = sub.id;

revoke all on table public.v_student_subject_targets from anon, authenticated;
grant select on table public.v_student_subject_targets to authenticated;
grant select on table public.v_student_subject_targets to service_role;

-- v_coach_student_overview ----------------------------------------------------------------------

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
  greatest(0, coalesce(pc.topics_done, 0) - coalesce(pc.topics_expected, 0)) as topics_ahead
from public.students s
join public.profiles p on p.id = s.profile_id
left join week_totals wt on wt.student_id = s.profile_id
left join last_logs ll on ll.student_id = s.profile_id
left join weekly_goals wg on wg.student_id = s.profile_id
left join plan_week pw on pw.student_id = s.profile_id
left join plan_last_week plw on plw.student_id = s.profile_id
left join pace pc on pc.student_id = s.profile_id;

revoke all on table public.v_coach_student_overview from anon, authenticated;
grant select on table public.v_coach_student_overview to authenticated;
grant select on table public.v_coach_student_overview to service_role;
