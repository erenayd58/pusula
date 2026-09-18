-- Faz 4 kapanış düzeltmeleri (08 §2 Parça 4 notları):
--   1. v_plan_completion: "bugüne kadar" uyumu (to_date_*): bugün ve öncesindeki günlerin
--      görevleri + tamamlanmış "bu hafta içinde" görevleri (İstanbul günü). Geçmiş haftada
--      hafta geneliyle eşit; gelecek haftada yalnızca tamamlanmış gün atanmamış görevler.
--   2. v_coach_student_overview: + plan_to_date_percent_week (K1 sütunu öne çıkar).
--   3. v_student_setup_facts: kurulum olguları (program, hedef, bu haftanın yayınlanmış planı,
--      soru kaydı sayısı, hesap yaşı). Karar TypeScript'te (features/analytics/lib/alerts.ts,
--      evaluateSetupAlerts); yalnızca koç ekranlarında gösterilir.
--   4. Kurum ayarı alerts.setup_account_days (7): hesap bu kadar günden eskiyse ve hiç soru
--      kaydı yoksa "hiç soru kaydı yok" uyarısı.

-- 1. v_plan_completion (kolonlar sona eklenir; create or replace) --------------------------

create or replace view public.v_plan_completion
with (security_invoker = true) as
with today as (
  select
    (now() at time zone 'Europe/Istanbul')::date as d,
    extract(isodow from (now() at time zone 'Europe/Istanbul')::date)::int as dow
)
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
  end as percent,
  -- Bugüne kadar: geçmiş haftada hepsi; bu haftada günü bugün ve öncesi olanlar; gün atanmamış
  -- görevler yalnızca tamamlandıysa (henüz yapılmamış "bu hafta içinde" görevi gecikmiş sayılmaz).
  count(i.id) filter (where
    p.week_start + 7 <= t.d
    or (p.week_start <= t.d and i.day_of_week is not null and i.day_of_week <= t.dow)
    or (i.day_of_week is null and i.completed_at is not null)
  )::int as to_date_total,
  count(i.completed_at) filter (where
    p.week_start + 7 <= t.d
    or (p.week_start <= t.d and i.day_of_week is not null and i.day_of_week <= t.dow)
    or i.day_of_week is null
  )::int as to_date_completed,
  case
    when count(i.id) filter (where
      p.week_start + 7 <= t.d
      or (p.week_start <= t.d and i.day_of_week is not null and i.day_of_week <= t.dow)
      or (i.day_of_week is null and i.completed_at is not null)
    ) = 0 then null
    else floor(
      count(i.completed_at) filter (where
        p.week_start + 7 <= t.d
        or (p.week_start <= t.d and i.day_of_week is not null and i.day_of_week <= t.dow)
        or i.day_of_week is null
      ) * 100.0
      / count(i.id) filter (where
        p.week_start + 7 <= t.d
        or (p.week_start <= t.d and i.day_of_week is not null and i.day_of_week <= t.dow)
        or (i.day_of_week is null and i.completed_at is not null)
      )
    )::int
  end as to_date_percent
from public.weekly_plans p
cross join today t
left join public.plan_items i on i.plan_id = p.id
group by p.student_id, p.id, p.week_start, p.status, t.d, t.dow;

-- 2. v_coach_student_overview: mevcut kolonlar aynen + plan_to_date_percent_week -----------

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
  pw.to_date_percent as plan_to_date_percent_week
from public.students s
join public.profiles p on p.id = s.profile_id
left join week_totals wt on wt.student_id = s.profile_id
left join last_logs ll on ll.student_id = s.profile_id
left join weekly_goals wg on wg.student_id = s.profile_id
left join plan_week pw on pw.student_id = s.profile_id
left join plan_last_week plw on plw.student_id = s.profile_id;

-- 3. v_student_setup_facts ------------------------------------------------------------------

create view public.v_student_setup_facts
with (security_invoker = true) as
with today as (
  select (now() at time zone 'Europe/Istanbul')::date as d
),
week as (
  select (date_trunc('week', d))::date as week_start from today
)
select
  s.profile_id as student_id,
  s.organization_id,
  s.coach_id,
  s.status,
  s.created_at,
  (
    exists (select 1 from public.busy_slots b where b.student_id = s.profile_id)
    or exists (select 1 from public.schedule_exceptions e where e.student_id = s.profile_id)
  ) as has_schedule,
  exists (
    select 1 from public.goals g where g.student_id = s.profile_id and g.is_active
  ) as has_active_goal,
  exists (
    select 1 from public.weekly_plans w, week
    where w.student_id = s.profile_id and w.week_start = week.week_start and w.status = 'published'
  ) as has_published_plan_week,
  (select count(*) from public.question_logs l where l.student_id = s.profile_id)::int
    as question_log_count
from public.students s;

revoke all on table public.v_student_setup_facts from anon, authenticated;
grant select on table public.v_student_setup_facts to authenticated;
grant select on table public.v_student_setup_facts to service_role;

-- 4. Kurum ayarı: alerts.setup_account_days ---------------------------------------------------

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
    'suggestions', jsonb_build_object('max_per_student', 5, 'dismiss_days', 14)
  )
$$;

revoke all on function private.default_org_settings() from public, anon, authenticated;

-- Mevcut kurumlara yalnızca eksik anahtar yazılır (mevcut değer kazanır).
update public.organizations
  set settings = jsonb_set(settings, '{alerts,setup_account_days}', '7'::jsonb, true)
  where settings #> '{alerts,setup_account_days}' is null;
