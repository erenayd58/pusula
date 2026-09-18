-- Faz 5a: müfredat takvimi (09-faz5-strateji.md §1.3, karar B1).
--   1. topics.school_finish_on: okulda tahmini bitiş tarihi (şablon düzeyi; ünite düzeyi konularda
--      dolu, alt konular üstünden okur). İndeks gerekmez (şablon başına ~54 satır); RLS/grant
--      değişmez: koç ve owner sistem şablonunu düzenler (karar #28).
--   2. topic_alert_kind + 'behind_school' (karar #32 kalıbı): okul bitişinden `school_lag_weeks`
--      hafta sonra hâlâ bitmemiş konu. suggestion_dismissals.kind aynı enum → "Şimdi değil" çalışır.
--   3. set_topic_school_dates(p_rows jsonb): toplu tarih yazma; security invoker (RLS uygulanır),
--      tek UPDATE → atomik. Güncellenen satır payload'dan azsa (görünmeyen/yetkisiz konu) 42501 ve
--      hiçbir satır yazılmaz.
--   4. v_topic_alert_facts: sona `school_finish_on` eklenir (create or replace).

-- 1. Kolon --------------------------------------------------------------------------------------

alter table public.topics add column school_finish_on date;

-- 2. Enum ---------------------------------------------------------------------------------------

alter type public.topic_alert_kind add value 'behind_school';

-- 3. RPC ----------------------------------------------------------------------------------------

create function public.set_topic_school_dates(p_rows jsonb)
returns int
language plpgsql
set search_path = ''
as $$
declare
  v_expected int;
  v_updated int;
begin
  if p_rows is null or jsonb_typeof(p_rows) <> 'array' then
    raise exception 'invalid_rows' using errcode = '22023';
  end if;

  select count(distinct r.topic_id) into v_expected
  from jsonb_to_recordset(p_rows) as r(topic_id uuid, "on" date);

  update public.topics t
  set school_finish_on = r."on"
  from jsonb_to_recordset(p_rows) as r(topic_id uuid, "on" date)
  where t.id = r.topic_id;
  get diagnostics v_updated = row_count;

  -- RLS'nin sessizce filtrelediği satır varsa (öğrenci/veli ya da başka kurumun şablonu) yazma
  -- geri alınır: okuyabilen ama düzenleyemeyen kullanıcı 42501 alır.
  if v_updated < v_expected then
    raise exception 'not_allowed' using errcode = '42501';
  end if;

  return v_updated;
end;
$$;

revoke execute on function public.set_topic_school_dates(jsonb) from public, anon;
grant execute on function public.set_topic_school_dates(jsonb) to authenticated;

-- 4. v_topic_alert_facts (+ school_finish_on, sona) ---------------------------------------------

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
  (
    f.status = 'not_started'
    and row_number() over (
      partition by f.student_id, f.subject_id, (f.status = 'not_started')
      order by f.topic_sort_order, f.topic_id
    ) = 1
  ) as is_next_topic,
  f.school_finish_on
from facts f;
