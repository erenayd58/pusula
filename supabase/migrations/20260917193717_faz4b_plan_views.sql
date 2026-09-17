-- Faz 4b: plan görünümleri (08 §1.4). Hepsi security_invoker; authenticated yalnızca select.
-- Plan uyumu = tamamlanan / toplam görev (yalnızca yayınlanmış plan; öğe yoksa null).
-- Erteleme yüzdeyi etkilemez, postponed_count bilgi amaçlıdır.

create view public.v_plan_completion
with (security_invoker = true) as
select
  p.student_id,
  p.id as plan_id,
  p.week_start,
  p.status,
  count(i.id)::int as items_total,
  count(i.completed_at)::int as items_completed,
  count(i.postponed_at)::int as postponed_count,
  case
    when count(i.id) = 0 then null
    else floor(count(i.completed_at) * 100.0 / count(i.id))::int
  end as percent
from public.weekly_plans p
left join public.plan_items i on i.plan_id = p.id
group by p.student_id, p.id, p.week_start, p.status;

-- Ders bazlı tempo: son alerts.lookback_days (kurum ayarı) içinde süresi girilmiş kayıtlardan
-- soru başına dakika. Tahmini süre önerisi bunu kullanır; veri yoksa kurum varsayılanı.
create view public.v_student_subject_pace
with (security_invoker = true) as
select
  l.student_id,
  l.subject_id,
  sum(l.total_count)::int as questions,
  sum(l.duration_minutes)::int as minutes,
  round(sum(l.duration_minutes)::numeric / sum(l.total_count), 2) as minutes_per_question
from public.question_logs l
join public.students s on s.profile_id = l.student_id
join public.organizations o on o.id = s.organization_id
where l.duration_minutes is not null
  and l.log_date >= (now() at time zone 'Europe/Istanbul')::date
    - coalesce((o.settings #>> '{alerts,lookback_days}')::int, 60)
group by l.student_id, l.subject_id;

-- Haftada planlı konular: öneri motoru "bu hafta zaten planlı" filtresi (Parça 4).
create view public.v_week_plan_topics
with (security_invoker = true) as
select distinct p.student_id, p.week_start, i.subject_id, i.topic_id
from public.plan_items i
join public.weekly_plans p on p.id = i.plan_id
where i.topic_id is not null;

-- Koç öğrenci listesi: Faz 3 kolonları aynen + plan uyumu (bu hafta, geçen hafta).
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
  select c.student_id, c.percent, c.items_total, c.items_completed
  from public.v_plan_completion c, week w
  where c.week_start = w.week_start and c.status = 'published'
),
plan_last_week as (
  select c.student_id, c.percent
  from public.v_plan_completion c, week w
  where c.week_start = w.week_start - 7 and c.status = 'published'
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
  plw.percent as plan_percent_last_week
from public.students s
join public.profiles p on p.id = s.profile_id
left join week_totals wt on wt.student_id = s.profile_id
left join last_logs ll on ll.student_id = s.profile_id
left join weekly_goals wg on wg.student_id = s.profile_id
left join plan_week pw on pw.student_id = s.profile_id
left join plan_last_week plw on plw.student_id = s.profile_id;

revoke all on table
  public.v_plan_completion,
  public.v_student_subject_pace,
  public.v_week_plan_topics
from anon, authenticated;

grant select on table
  public.v_plan_completion,
  public.v_student_subject_pace,
  public.v_week_plan_topics
to authenticated;

grant select on table
  public.v_plan_completion,
  public.v_student_subject_pace,
  public.v_week_plan_topics
to service_role;
