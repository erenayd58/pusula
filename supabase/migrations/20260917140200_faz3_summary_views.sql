-- Faz 3: özet görünümler (03-veri-modeli.md Bölüm 6). Hepsi security_invoker: alttaki
-- tabloların RLS'si uygulanır. "Bugün" ve "bu hafta" Europe/Istanbul'a göre; hafta
-- pazartesi başlar (date_trunc('week') ISO haftasıdır). authenticated'a yalnızca select.

-- Günlük özet: Bugün ekranı, seri, koç genel bakış (son 14 gün).
create view public.v_student_daily_summary
with (security_invoker = true) as
select
  student_id,
  log_date as day,
  sum(total_count)::int as questions,
  sum(coalesce(correct_count, 0))::int as correct,
  sum(coalesce(wrong_count, 0))::int as wrong,
  sum(coalesce(blank_count, 0))::int as blank,
  sum(coalesce(duration_minutes, 0))::int as study_minutes
from public.question_logs
group by student_id, log_date;

-- Haftalık ders dağılımı: Bugün ekranı "bu hafta" çubukları.
create view public.v_student_subject_weekly
with (security_invoker = true) as
select
  student_id,
  (date_trunc('week', log_date))::date as week_start,
  subject_id,
  sum(total_count)::int as questions,
  sum(coalesce(correct_count, 0))::int as correct,
  sum(coalesce(wrong_count, 0))::int as wrong
from public.question_logs
group by student_id, (date_trunc('week', log_date))::date, subject_id;

-- Konu başına toplam soru ve doğru: konu haritası hücre detayı (topics modülü buradan okur).
create view public.v_topic_question_stats
with (security_invoker = true) as
select
  student_id,
  topic_id,
  sum(total_count)::int as questions,
  sum(coalesce(correct_count, 0))::int as correct
from public.question_logs
where topic_id is not null
group by student_id, topic_id;

-- Koç öğrenci listesi (K1): tek sorgu. Bu hafta = İstanbul bugününün ISO haftası.
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
  end as week_goal_percent
from public.students s
join public.profiles p on p.id = s.profile_id
left join week_totals wt on wt.student_id = s.profile_id
left join last_logs ll on ll.student_id = s.profile_id
left join weekly_goals wg on wg.student_id = s.profile_id;

revoke all on table
  public.v_student_daily_summary,
  public.v_student_subject_weekly,
  public.v_topic_question_stats,
  public.v_coach_student_overview
from anon, authenticated;

grant select on table
  public.v_student_daily_summary,
  public.v_student_subject_weekly,
  public.v_topic_question_stats,
  public.v_coach_student_overview
to authenticated;

grant select on table
  public.v_student_daily_summary,
  public.v_student_subject_weekly,
  public.v_topic_question_stats,
  public.v_coach_student_overview
to service_role;
