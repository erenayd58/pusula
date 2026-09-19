-- Faz 6a: v_coach_student_overview + son genel deneme neti (10 §1.3). Kolonlar sona eklenir
-- (drop + create, Faz 5b kalıbı): last_net (son GENEL denemenin toplam neti), prev_net, net_delta
-- (= last − prev; tek deneme → null), last_mock_on. K1 "Son net" sütunu tek sorgudan; Faz 8
-- "Net düşüşü" uyarısı aynı kolonlardan. Branş denemeleri sayılmaz (karar C3).

drop view public.v_coach_student_overview;

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
  lm.last_mock_on
from public.students s
join public.profiles p on p.id = s.profile_id
left join week_totals wt on wt.student_id = s.profile_id
left join last_logs ll on ll.student_id = s.profile_id
left join weekly_goals wg on wg.student_id = s.profile_id
left join plan_week pw on pw.student_id = s.profile_id
left join plan_last_week plw on plw.student_id = s.profile_id
left join pace pc on pc.student_id = s.profile_id
left join last_mock lm on lm.student_id = s.profile_id
left join prev_mock pm on pm.student_id = s.profile_id;

revoke all on table public.v_coach_student_overview from anon, authenticated;
grant select on table public.v_coach_student_overview to authenticated;
grant select on table public.v_coach_student_overview to service_role;
